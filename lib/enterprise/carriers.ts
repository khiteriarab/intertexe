import type { SupabaseClient } from "@supabase/supabase-js";
import { newPublicId } from "./ids";

export type CarrierType = "qr" | "nfc" | "rfid";
export type CarrierState = "draft" | "active" | "retired";

export type DataCarrierRow = {
  id: string;
  organization_id: string;
  passport_id: string;
  product_id: string | null;
  persistent_identity_id: string | null;
  carrier_type: CarrierType;
  artwork_variant: string | null;
  public_url: string;
  state: CarrierState;
  activated_at: string | null;
  retired_at: string | null;
  batch_label: string | null;
  encoding_format: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com").replace(/\/$/, "");
}

export function publicResolverUrl(publicId: string): string {
  return `${siteOrigin()}/p/${publicId}`;
}

/** Mint identity + passport shell when product is ready (Option B — pre-publish provisioning). */
export async function ensurePassportShell(
  client: SupabaseClient,
  organizationId: string,
  productId: string
): Promise<{ passportId: string; publicId: string; publicUrl: string; identityId: string }> {
  let { data: identity } = await client
    .from("persistent_identities")
    .select("id, public_id")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .eq("active", true)
    .maybeSingle();

  if (!identity?.public_id) {
    const publicId = newPublicId();
    const inserted = await client
      .from("persistent_identities")
      .insert({
        organization_id: organizationId,
        product_id: productId,
        public_id: publicId,
      })
      .select("id, public_id")
      .maybeSingle();
    identity = inserted.data;
  }
  if (!identity?.public_id) throw new Error("Could not allocate a public identity.");

  const publicUrl = publicResolverUrl(identity.public_id);

  let { data: passport } = await client
    .from("passports")
    .select("id, public_id, state")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .maybeSingle();

  if (!passport?.id) {
    const created = await client
      .from("passports")
      .insert({
        organization_id: organizationId,
        product_id: productId,
        public_id: identity.public_id,
        state: "ready",
      })
      .select("id, public_id, state")
      .maybeSingle();
    passport = created.data;
  } else if (passport.public_id !== identity.public_id) {
    await client
      .from("passports")
      .update({ public_id: identity.public_id })
      .eq("id", passport.id);
  }

  if (!passport?.id) throw new Error("Could not create passport shell.");

  return {
    passportId: passport.id,
    publicId: identity.public_id,
    publicUrl,
    identityId: identity.id,
  };
}

/** Create or refresh a draft QR carrier for hang-tag artwork before first publish. */
export async function provisionDraftQrCarrier(
  client: SupabaseClient,
  organizationId: string,
  productId: string,
  opts?: { artworkVariant?: string; batchLabel?: string }
): Promise<DataCarrierRow> {
  const shell = await ensurePassportShell(client, organizationId, productId);

  const { data: existing } = await client
    .from("data_carriers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("passport_id", shell.passportId)
    .eq("carrier_type", "qr")
    .in("state", ["draft", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.state === "draft") {
    const { data: updated } = await client
      .from("data_carriers")
      .update({
        public_url: shell.publicUrl,
        artwork_variant: opts?.artworkVariant || existing.artwork_variant || "default",
        batch_label: opts?.batchLabel ?? existing.batch_label,
        product_id: productId,
        persistent_identity_id: shell.identityId,
      })
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();
    if (updated) return updated as DataCarrierRow;
    return existing as DataCarrierRow;
  }

  if (existing?.state === "active") {
    return existing as DataCarrierRow;
  }

  const { data: inserted, error } = await client
    .from("data_carriers")
    .insert({
      organization_id: organizationId,
      passport_id: shell.passportId,
      product_id: productId,
      persistent_identity_id: shell.identityId,
      carrier_type: "qr",
      artwork_variant: opts?.artworkVariant || "default",
      public_url: shell.publicUrl,
      state: "draft",
      batch_label: opts?.batchLabel || null,
      encoding_format: "url",
    })
    .select("*")
    .maybeSingle();

  if (error || !inserted) throw new Error(error?.message || "Could not provision draft QR carrier.");
  return inserted as DataCarrierRow;
}

/** On publish: activate draft QR or upsert active QR; retire prior active rows of same type. */
export async function syncQrCarrierOnPublish(
  client: SupabaseClient,
  input: {
    organizationId: string;
    productId: string;
    passportId: string;
    identityId: string;
    publicUrl: string;
  }
): Promise<DataCarrierRow> {
  const now = new Date().toISOString();

  const { data: draft } = await client
    .from("data_carriers")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("passport_id", input.passportId)
    .eq("carrier_type", "qr")
    .eq("state", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draft?.id) {
    await client
      .from("data_carriers")
      .update({ state: "retired", retired_at: now })
      .eq("organization_id", input.organizationId)
      .eq("passport_id", input.passportId)
      .eq("carrier_type", "qr")
      .eq("state", "active");

    const { data: activated } = await client
      .from("data_carriers")
      .update({
        state: "active",
        activated_at: now,
        public_url: input.publicUrl,
        product_id: input.productId,
        persistent_identity_id: input.identityId,
      })
      .eq("id", draft.id)
      .select("*")
      .maybeSingle();
    if (activated) return activated as DataCarrierRow;
  }

  const { data: active } = await client
    .from("data_carriers")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("passport_id", input.passportId)
    .eq("carrier_type", "qr")
    .eq("state", "active")
    .maybeSingle();

  if (active?.id) {
    const { data: updated } = await client
      .from("data_carriers")
      .update({
        public_url: input.publicUrl,
        product_id: input.productId,
        persistent_identity_id: input.identityId,
        activated_at: active.activated_at || now,
      })
      .eq("id", active.id)
      .select("*")
      .maybeSingle();
    if (updated) return updated as DataCarrierRow;
    return active as DataCarrierRow;
  }

  const { data: inserted, error } = await client
    .from("data_carriers")
    .insert({
      organization_id: input.organizationId,
      passport_id: input.passportId,
      product_id: input.productId,
      persistent_identity_id: input.identityId,
      carrier_type: "qr",
      artwork_variant: "default",
      public_url: input.publicUrl,
      state: "active",
      activated_at: now,
      encoding_format: "url",
    })
    .select("*")
    .maybeSingle();

  if (error || !inserted) throw new Error(error?.message || "Could not sync QR carrier on publish.");
  return inserted as DataCarrierRow;
}

export async function loadProductCarriers(
  client: SupabaseClient,
  organizationId: string,
  productId: string
): Promise<DataCarrierRow[]> {
  const { data } = await client
    .from("data_carriers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  return (data || []) as DataCarrierRow[];
}

export async function registerCarrierType(
  client: SupabaseClient,
  input: {
    organizationId: string;
    productId: string;
    carrierType: CarrierType;
    artworkVariant?: string;
    batchLabel?: string;
    encodingFormat?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<DataCarrierRow> {
  if (input.carrierType === "qr") {
    return provisionDraftQrCarrier(client, input.organizationId, input.productId, {
      artworkVariant: input.artworkVariant,
      batchLabel: input.batchLabel,
    });
  }

  const shell = await ensurePassportShell(client, input.organizationId, input.productId);
  const { data: inserted, error } = await client
    .from("data_carriers")
    .insert({
      organization_id: input.organizationId,
      passport_id: shell.passportId,
      product_id: input.productId,
      persistent_identity_id: shell.identityId,
      carrier_type: input.carrierType,
      artwork_variant: input.artworkVariant || "default",
      public_url: shell.publicUrl,
      state: "draft",
      batch_label: input.batchLabel || null,
      encoding_format: input.encodingFormat || input.carrierType,
      metadata: input.metadata || {},
    })
    .select("*")
    .maybeSingle();

  if (error || !inserted) throw new Error(error?.message || `Could not register ${input.carrierType} carrier.`);
  return inserted as DataCarrierRow;
}

export async function retireCarrier(
  client: SupabaseClient,
  organizationId: string,
  carrierId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await client
    .from("data_carriers")
    .update({ state: "retired", retired_at: now })
    .eq("organization_id", organizationId)
    .eq("id", carrierId)
    .neq("state", "retired");
  if (error) throw new Error(error.message);
}
