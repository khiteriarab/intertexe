import { getEnterpriseServiceClient } from "./client";
import { getResaleProvider } from "../resale/providers";
import { isDuplicateSale, planSoldSync, webhookIdempotencyKey } from "../resale/sync";
import type { MarketplaceProvider, ResaleListingDraft } from "../resale/types";
import { createOwnershipClaim, recordLifecycleEvent } from "./ownership-transfer";

export type IdentityContext = {
  persistentIdentityId: string;
  organizationId: string;
  productId: string;
  publicId: string;
};

export async function resolveIdentityByPublicId(publicId: string): Promise<IdentityContext | null> {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return null;

  const { data: passport } = await supabase
    .from("passports")
    .select("id, organization_id, product_id")
    .eq("public_id", publicId)
    .maybeSingle();

  if (passport) {
    const { data: identity } = await supabase
      .from("persistent_identities")
      .select("id")
      .eq("public_id", publicId)
      .eq("active", true)
      .maybeSingle();
    if (identity?.id) {
      return {
        persistentIdentityId: identity.id,
        organizationId: passport.organization_id,
        productId: passport.product_id,
        publicId,
      };
    }
  }

  const { data: identityOnly } = await supabase
    .from("persistent_identities")
    .select("id, organization_id, product_id, public_id")
    .eq("public_id", publicId)
    .eq("active", true)
    .maybeSingle();

  if (!identityOnly?.id) return null;
  return {
    persistentIdentityId: identityOnly.id,
    organizationId: identityOnly.organization_id,
    productId: identityOnly.product_id,
    publicId: identityOnly.public_id,
  };
}

export async function upsertResaleProfile(userId: string) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return null;
  await supabase.from("resale_profiles").upsert({ user_id: userId }, { onConflict: "user_id" });
  return userId;
}

export async function listMarketplaceConnections(userId: string) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("marketplace_connections")
    .select("provider, status, external_account_label, connected_at, capabilities")
    .eq("user_id", userId);
  return data || [];
}

export async function createResaleItem(input: {
  userId: string;
  identity: IdentityContext;
  conditionGrade: string;
  conditionNotes?: string;
  flaws?: string;
  askingPrice: number;
  minimumPrice?: number;
  currency: string;
  consumerPhotos: string[];
  integrityStatus: string;
  resaleEligible: boolean;
}) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) throw new Error("Enterprise database not configured");
  if (!input.resaleEligible) {
    throw new Error("Passport data conflict — resale blocked until reviewed");
  }

  const { data, error } = await supabase
    .from("resale_items")
    .insert({
      persistent_identity_id: input.identity.persistentIdentityId,
      organization_id: input.identity.organizationId,
      product_id: input.identity.productId,
      owner_user_id: input.userId,
      status: "draft",
      condition_grade: input.conditionGrade,
      condition_notes: input.conditionNotes || null,
      flaws: input.flaws || null,
      asking_price: input.askingPrice,
      minimum_price: input.minimumPrice ?? null,
      currency: input.currency,
      consumer_photos: input.consumerPhotos,
      integrity_status: input.integrityStatus,
      resale_eligible: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function publishToProviders(input: {
  userId: string;
  resaleItemId: string;
  providers: MarketplaceProvider[];
  draft: ResaleListingDraft;
}) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) throw new Error("Enterprise database not configured");

  const results: Array<{
    provider: MarketplaceProvider;
    listingId: string;
    status: string;
    externalListingId: string | null;
    externalUrl: string | null;
    handoffPackage?: unknown;
    errorMessage?: string;
  }> = [];

  for (const providerId of input.providers) {
    const provider = getResaleProvider(providerId);
    const { data: conn } = await supabase
      .from("marketplace_connections")
      .select("status, token_vault_key")
      .eq("user_id", input.userId)
      .eq("provider", providerId)
      .maybeSingle();

    const accessToken =
      providerId === "ebay" && conn?.token_vault_key
        ? process.env[conn.token_vault_key] || process.env.EBAY_USER_TOKEN
        : providerId === "ebay"
          ? process.env.EBAY_USER_TOKEN
          : null;

    const ctx = { userId: input.userId, accessToken, sandbox: true };
    const draftResult = await provider.createDraft(ctx, input.draft);
    const pubResult = await provider.publishListing(ctx, input.draft, draftResult.externalListingId);

    const listingStatus =
      pubResult.status === "published"
        ? "published"
        : pubResult.status === "handoff"
          ? "handoff"
          : pubResult.status === "pending_publish"
            ? "pending_publish"
            : pubResult.status === "error"
              ? "error"
              : "draft";

    const { data: listing, error } = await supabase
      .from("resale_listings")
      .upsert(
        {
          resale_item_id: input.resaleItemId,
          provider: providerId,
          external_listing_id: pubResult.externalListingId,
          external_url: pubResult.externalUrl,
          status: listingStatus,
          currency: input.draft.currency,
          asking_price: input.draft.askingPrice,
          published_at: listingStatus === "published" ? new Date().toISOString() : null,
          provider_payload: pubResult.handoffPackage ? { handoff: pubResult.handoffPackage } : {},
          error_message: pubResult.errorMessage || null,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "resale_item_id,provider" }
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    results.push({
      provider: providerId,
      listingId: listing.id,
      status: listingStatus,
      externalListingId: pubResult.externalListingId,
      externalUrl: pubResult.externalUrl,
      handoffPackage: pubResult.handoffPackage,
      errorMessage: pubResult.errorMessage,
    });
  }

  await supabase
    .from("resale_items")
    .update({ status: "listed", updated_at: new Date().toISOString() })
    .eq("id", input.resaleItemId);

  return results;
}

export async function markResaleItemSold(input: {
  resaleItemId: string;
  soldProvider: MarketplaceProvider;
  userId: string;
}) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) throw new Error("Enterprise database not configured");

  const { data: item } = await supabase
    .from("resale_items")
    .select("id, status, persistent_identity_id, organization_id")
    .eq("id", input.resaleItemId)
    .maybeSingle();

  if (!item) throw new Error("Resale item not found");
  if (isDuplicateSale(item.status)) {
    throw new Error("Item already sold — duplicate sale prevented");
  }

  const { data: listings } = await supabase
    .from("resale_listings")
    .select("id, provider, external_listing_id, status")
    .eq("resale_item_id", input.resaleItemId);

  const plan = planSoldSync(listings || [], input.soldProvider);
  const deactivated: Array<{ provider: MarketplaceProvider; ok: boolean; message?: string }> = [];

  for (const row of plan.toDeactivate) {
    const provider = getResaleProvider(row.provider);
    const { data: conn } = await supabase
      .from("marketplace_connections")
      .select("token_vault_key")
      .eq("user_id", input.userId)
      .eq("provider", row.provider)
      .maybeSingle();
    const accessToken =
      row.provider === "ebay"
        ? process.env[conn?.token_vault_key || ""] || process.env.EBAY_USER_TOKEN
        : null;
    const result = await provider.deactivateListing(
      { userId: input.userId, accessToken, sandbox: true },
      row.external_listing_id!
    );
    deactivated.push({ provider: row.provider, ok: result.ok, message: result.message });
    await supabase
      .from("resale_listings")
      .update({ status: "deactivated", last_synced_at: new Date().toISOString() })
      .eq("id", row.id);
  }

  await supabase
    .from("resale_listings")
    .update({ status: "sold", sold_at: new Date().toISOString() })
    .eq("resale_item_id", input.resaleItemId)
    .eq("provider", input.soldProvider);

  await supabase
    .from("resale_items")
    .update({ status: "transfer_pending", updated_at: new Date().toISOString() })
    .eq("id", input.resaleItemId);

  await recordLifecycleEvent({
    persistentIdentityId: item.persistent_identity_id,
    organizationId: item.organization_id,
    eventKind: "resale_sold",
    publicLabel: "Entered resale",
    publicDetail: null,
    eventYear: new Date().getFullYear(),
  });

  const claim = await createOwnershipClaim(item.persistent_identity_id, input.resaleItemId);

  return {
    itemStatus: "transfer_pending" as const,
    deactivated,
    handoffActionRequired: plan.handoffActionRequired,
    ownershipClaimToken: claim.token,
  };
}

export async function processMarketplaceWebhook(input: {
  provider: MarketplaceProvider;
  externalEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) throw new Error("Enterprise database not configured");

  const idempotencyKey = webhookIdempotencyKey(
    input.provider,
    input.externalEventId,
    input.eventType
  );

  const { error: insertErr } = await supabase.from("marketplace_webhook_events").insert({
    provider: input.provider,
    external_event_id: input.externalEventId,
    event_type: input.eventType,
    payload: input.payload,
    idempotency_key: idempotencyKey,
  });

  if (insertErr?.code === "23505") {
    return { duplicate: true, processed: false };
  }
  if (insertErr) throw new Error(insertErr.message);

  if (input.eventType === "item.sold" || input.eventType === "order.completed") {
    const resaleItemId = String(input.payload.resale_item_id || input.payload.intertexe_resale_item_id || "");
    const userId = String(input.payload.user_id || "");
    if (resaleItemId && userId) {
      await markResaleItemSold({
        resaleItemId,
        soldProvider: input.provider,
        userId,
      });
    }
  }

  await supabase
    .from("marketplace_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("idempotency_key", idempotencyKey);

  return { duplicate: false, processed: true };
}

export async function loadLifecycleEvents(persistentIdentityId: string) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("product_lifecycle_events")
    .select("event_year, public_label, public_detail")
    .eq("persistent_identity_id", persistentIdentityId)
    .eq("is_public", true)
    .order("occurred_at", { ascending: true });
  return (data || []).map((row) => ({
    year: row.event_year,
    label: row.public_label,
    detail: row.public_detail,
  }));
}
