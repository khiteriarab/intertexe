import { randomBytes } from "crypto";
import { getEnterpriseServiceClient } from "./client";

export async function recordLifecycleEvent(input: {
  persistentIdentityId: string;
  organizationId: string;
  eventKind: string;
  publicLabel: string;
  publicDetail?: string | null;
  eventYear?: number | null;
  isPublic?: boolean;
}) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("product_lifecycle_events")
    .insert({
      persistent_identity_id: input.persistentIdentityId,
      organization_id: input.organizationId,
      event_kind: input.eventKind,
      event_year: input.eventYear ?? new Date().getFullYear(),
      public_label: input.publicLabel,
      public_detail: input.publicDetail || null,
      is_public: input.isPublic !== false,
      source: "system",
    })
    .select("id")
    .single();
  if (error) return null;
  return data.id;
}

/** Secure claim token for buyer — no PII in public passport. */
export async function createOwnershipClaim(persistentIdentityId: string, resaleItemId: string) {
  const supabase = getEnterpriseServiceClient();
  const token = randomBytes(24).toString("base64url");
  if (!supabase) return { token, persisted: false };

  const { count } = await supabase
    .from("ownership_events")
    .select("id", { count: "exact", head: true })
    .eq("persistent_identity_id", persistentIdentityId);

  const sequence = (count || 0) + 1;

  await supabase.from("ownership_events").insert({
    persistent_identity_id: persistentIdentityId,
    event_type: "transfer_pending",
    owner_sequence: sequence,
    public_summary: `Entered ownership cycle ${sequence}`,
    private_metadata: {
      claim_token_hash: token.slice(0, 8),
      resale_item_id: resaleItemId,
    },
  });

  return { token, persisted: true, ownerSequence: sequence };
}

export async function claimOwnership(input: {
  persistentIdentityId: string;
  claimToken: string;
  newOwnerUserId: string;
}) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) throw new Error("Enterprise database not configured");

  const { data: pending } = await supabase
    .from("ownership_events")
    .select("id, owner_sequence, private_metadata")
    .eq("persistent_identity_id", input.persistentIdentityId)
    .eq("event_type", "transfer_pending")
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) throw new Error("No pending transfer");

  const meta = (pending.private_metadata || {}) as Record<string, unknown>;
  const hash = String(meta.claim_token_hash || "");
  if (!input.claimToken.startsWith(hash)) {
    throw new Error("Invalid claim token");
  }

  await supabase.from("ownership_events").insert({
    persistent_identity_id: input.persistentIdentityId,
    event_type: "ownership_claimed",
    owner_sequence: pending.owner_sequence,
    public_summary: `Entered second ownership — ${new Date().getFullYear()}`,
    private_metadata: { new_owner_user_id: input.newOwnerUserId },
  });

  return { ownerSequence: pending.owner_sequence };
}
