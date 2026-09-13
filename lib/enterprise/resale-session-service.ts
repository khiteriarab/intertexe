import { randomBytes } from "node:crypto";
import { buildListingDraftFromPassport } from "../resale/listing-draft";
import { buildResaleRoutes } from "../resale/routes";
import type { ResaleRouteOption, ResaleSessionStatus, ResaleValuation } from "../resale/types";
import { buildResaleIntelligence } from "../resale/intelligence";
import { getEnterpriseServiceClient } from "./client";
import type { ConsumerPassportContent } from "./public-passport-content";
import { resolveIdentityByPublicId } from "./resale-service";

const SESSION_TTL_HOURS = 48;

function sessionToken(): string {
  return `rs_${randomBytes(12).toString("hex")}`;
}

export { buildResaleIntelligence as computeResaleIntelligence };

export async function createResaleSession(input: {
  publicId: string;
  consumer: ConsumerPassportContent;
  ownerUserId?: string | null;
  initiatedBy: "consumer" | "brand";
  brandClientRef?: string | null;
  organizationId?: string;
}) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) throw new Error("Enterprise database not configured");

  const identity = await resolveIdentityByPublicId(input.publicId);
  if (!identity) throw new Error("identity_not_found");

  const valuation = buildResaleIntelligence(input.consumer);
  const routes = buildResaleRoutes(valuation, input.consumer.brand);
  const listingDraft = buildListingDraftFromPassport({
    consumer: input.consumer,
    publicId: input.publicId,
    conditionGrade: "excellent",
    askingPrice: valuation.estimatedValue,
    currency: valuation.currency,
    consumerPhotos: [],
  });

  const token = sessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const { data: session, error } = await supabase
    .from("resale_sessions")
    .insert({
      session_token: token,
      public_id: input.publicId,
      persistent_identity_id: identity.persistentIdentityId,
      organization_id: input.organizationId || identity.organizationId,
      product_id: identity.productId,
      owner_user_id: input.ownerUserId || null,
      initiated_by: input.initiatedBy,
      brand_client_ref: input.brandClientRef || null,
      status: "draft_ready",
      valuation,
      listing_draft: listingDraft,
      expires_at: expiresAt,
    })
    .select("id, session_token, status, expires_at")
    .single();

  if (error) throw new Error(error.message);

  await insertRoutes(session.id, routes);

  return {
    sessionId: session.session_token as string,
    internalId: session.id as string,
    status: session.status as ResaleSessionStatus,
    expiresAt: session.expires_at as string,
    valuation,
    routes,
    listingDraft,
  };
}

async function insertRoutes(sessionId: string, routes: ResaleRouteOption[]) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return;
  await supabase.from("resale_session_routes").insert(
    routes.map((r) => ({
      session_id: sessionId,
      route_kind: r.routeKind,
      provider: r.provider,
      label: r.label,
      you_receive_amount: r.youReceive,
      you_receive_label: r.youReceiveLabel,
      currency: r.currency,
      speed_label: r.speedLabel,
      estimated_days_min: r.estimatedDaysMin,
      estimated_days_max: r.estimatedDaysMax,
      is_recommended: r.recommended,
      metadata: r.metadata || {},
    }))
  );
}

export async function getResaleSession(sessionToken: string) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return null;

  const { data: session } = await supabase
    .from("resale_sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    return { expired: true as const, sessionId: session.session_token };
  }

  const { data: routes } = await supabase
    .from("resale_session_routes")
    .select("*")
    .eq("session_id", session.id)
    .order("is_recommended", { ascending: false });

  return {
    expired: false as const,
    sessionId: session.session_token as string,
    publicId: session.public_id as string,
    status: session.status as ResaleSessionStatus,
    expiresAt: session.expires_at as string,
    valuation: session.valuation as ResaleValuation,
    listingDraft: session.listing_draft,
    routes: (routes || []).map((r) => ({
      id: r.id,
      routeKind: r.route_kind,
      provider: r.provider,
      label: r.label,
      youReceive: Number(r.you_receive_amount),
      youReceiveLabel: r.you_receive_label,
      currency: r.currency,
      speedLabel: r.speed_label,
      estimatedDaysMin: r.estimated_days_min,
      estimatedDaysMax: r.estimated_days_max,
      recommended: r.is_recommended,
      metadata: r.metadata,
    })),
    ownerUserId: session.owner_user_id as string | null,
    initiatedBy: session.initiated_by as string,
  };
}

export async function attachOwnerToSession(sessionToken: string, ownerUserId: string) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) throw new Error("Enterprise database not configured");
  await supabase
    .from("resale_sessions")
    .update({ owner_user_id: ownerUserId, updated_at: new Date().toISOString() })
    .eq("session_token", sessionToken);
}

export async function linkSessionToResaleItem(sessionToken: string, resaleItemId: string) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return;
  await supabase
    .from("resale_sessions")
    .update({
      resale_item_id: resaleItemId,
      status: "listed",
      updated_at: new Date().toISOString(),
    })
    .eq("session_token", sessionToken);
}
