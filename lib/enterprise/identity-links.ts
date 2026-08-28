import { getServerSupabase } from "../supabase-service-client";

export type IdentityLinkRow = {
  id: string;
  hq_user_id: string;
  enterprise_user_id: string;
  status: "pending" | "active" | "revoked";
  email_audit: string | null;
};

export type HandoffSessionRow = {
  id: string;
  session_id: string;
  identity_link_id: string;
  hq_user_id: string;
  enterprise_user_id: string;
  expires_at: string;
  revoked_at: string | null;
};

function hq() {
  return getServerSupabase();
}

export async function getActiveIdentityLinkByHqUserId(
  hqUserId: string
): Promise<IdentityLinkRow | null> {
  const supabase = hq();
  if (!supabase || !hqUserId) return null;
  const { data, error } = await supabase
    .from("enterprise_identity_links")
    .select("id, hq_user_id, enterprise_user_id, status, email_audit")
    .eq("hq_user_id", hqUserId)
    .eq("status", "active")
    .maybeSingle();
  if (error) return null;
  return (data as IdentityLinkRow | null) || null;
}

export async function getIdentityLinkByEnterpriseUserId(
  enterpriseUserId: string
): Promise<IdentityLinkRow | null> {
  const supabase = hq();
  if (!supabase || !enterpriseUserId) return null;
  const { data, error } = await supabase
    .from("enterprise_identity_links")
    .select("id, hq_user_id, enterprise_user_id, status, email_audit")
    .eq("enterprise_user_id", enterpriseUserId)
    .maybeSingle();
  if (error) return null;
  return (data as IdentityLinkRow | null) || null;
}

export async function isLinkedEnterprisePrincipal(enterpriseUserId: string): Promise<boolean> {
  const link = await getIdentityLinkByEnterpriseUserId(enterpriseUserId);
  return Boolean(link);
}

export async function upsertActiveIdentityLink(input: {
  hqUserId: string;
  enterpriseUserId: string;
  createdBy: string | null;
  emailAudit?: string | null;
}): Promise<IdentityLinkRow> {
  const supabase = hq();
  if (!supabase) throw new Error("HQ database is not configured.");
  const { data, error } = await supabase
    .from("enterprise_identity_links")
    .upsert(
      {
        hq_user_id: input.hqUserId,
        enterprise_user_id: input.enterpriseUserId,
        status: "active",
        email_audit: input.emailAudit?.trim().toLowerCase() || null,
        created_by: input.createdBy,
        revoked_at: null,
        revoked_by: null,
      },
      { onConflict: "hq_user_id" }
    )
    .select("id, hq_user_id, enterprise_user_id, status, email_audit")
    .maybeSingle();
  if (error || !data) throw new Error(error?.message || "Could not store identity link.");
  return data as IdentityLinkRow;
}

export async function revokeIdentityLink(input: {
  hqUserId: string;
  revokedBy: string | null;
}): Promise<void> {
  const supabase = hq();
  if (!supabase) throw new Error("HQ database is not configured.");
  await supabase
    .from("enterprise_identity_links")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: input.revokedBy,
    })
    .eq("hq_user_id", input.hqUserId);
  await supabase
    .from("enterprise_handoff_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("hq_user_id", input.hqUserId)
    .is("revoked_at", null);
}

export async function recordHandoffSession(input: {
  sessionId: string;
  identityLinkId: string;
  hqUserId: string;
  enterpriseUserId: string;
  expiresAt: Date;
}): Promise<void> {
  const supabase = hq();
  if (!supabase) throw new Error("HQ database is not configured.");
  const { error } = await supabase.from("enterprise_handoff_sessions").insert({
    session_id: input.sessionId,
    identity_link_id: input.identityLinkId,
    hq_user_id: input.hqUserId,
    enterprise_user_id: input.enterpriseUserId,
    expires_at: input.expiresAt.toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function getHandoffSession(sessionId: string): Promise<HandoffSessionRow | null> {
  const supabase = hq();
  if (!supabase || !sessionId) return null;
  const { data } = await supabase
    .from("enterprise_handoff_sessions")
    .select("id, session_id, identity_link_id, hq_user_id, enterprise_user_id, expires_at, revoked_at")
    .eq("session_id", sessionId)
    .maybeSingle();
  return (data as HandoffSessionRow | null) || null;
}

export async function revokeHandoffSession(sessionId: string): Promise<void> {
  const supabase = hq();
  if (!supabase || !sessionId) return;
  await supabase
    .from("enterprise_handoff_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .is("revoked_at", null);
}

export async function revokeHandoffSessionsForHqUser(hqUserId: string): Promise<void> {
  const supabase = hq();
  if (!supabase || !hqUserId) return;
  await supabase
    .from("enterprise_handoff_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("hq_user_id", hqUserId)
    .is("revoked_at", null);
}

export function handoffIsLive(row: HandoffSessionRow, now = Date.now()): boolean {
  if (row.revoked_at) return false;
  return new Date(row.expires_at).getTime() > now;
}
