import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { invitationSummary, type InvitationRow } from "./invitation-status";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function publicSiteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com").replace(/\/$/, "");
}

export function invitePathFromToken(token: string): string {
  return `/dashboard/login?invite=${token}`;
}

export function inviteUrlFromToken(token: string): string {
  return `${publicSiteOrigin()}${invitePathFromToken(token)}`;
}

export async function listOrganizationInvitations(
  client: SupabaseClient,
  organizationId: string
): Promise<ReturnType<typeof invitationSummary>[]> {
  const { data } = await client
    .from("invitations")
    .select("id, email, role, expires_at, accepted_at, revoked_at, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data || []).map((row) => invitationSummary(row as InvitationRow));
}

export async function createOrganizationInvitation(input: {
  client: SupabaseClient;
  organizationId: string;
  email: string;
  role: string;
  invitedByProfileId?: string | null;
  actorEmail: string;
  auditAction?: string;
}): Promise<{ invitationId: string; invitePath: string; inviteUrl: string; token: string }> {
  const email = input.email.trim().toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { data: row, error } = await input.client
    .from("invitations")
    .insert({
      organization_id: input.organizationId,
      email,
      role: input.role,
      token_hash: tokenHash(token),
      invited_by: input.invitedByProfileId || null,
      expires_at: expiresAt,
    })
    .select("id")
    .maybeSingle();
  if (error || !row?.id) throw new Error(error?.message || "Could not create invitation.");

  await input.client.from("audit_logs").insert({
    organization_id: input.organizationId,
    action: input.auditAction || "invitation_created",
    object_type: "invitation",
    object_id: row.id,
    request_meta: { actor_email: input.actorEmail, email, role: input.role },
  });

  const invitePath = invitePathFromToken(token);
  return {
    invitationId: row.id,
    invitePath,
    inviteUrl: inviteUrlFromToken(token),
    token,
  };
}

export async function revokePendingInvitations(input: {
  client: SupabaseClient;
  organizationId: string;
  actorEmail: string;
  email?: string;
  auditAction?: string;
}): Promise<number> {
  const now = new Date().toISOString();
  let query = input.client
    .from("invitations")
    .select("id, email")
    .eq("organization_id", input.organizationId)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (input.email) query = query.eq("email", input.email.trim().toLowerCase());
  const { data: rows } = await query;
  const pending = rows || [];
  if (!pending.length) return 0;

  const ids = pending.map((row) => row.id);
  await input.client.from("invitations").update({ revoked_at: now }).in("id", ids);
  for (const row of pending) {
    await input.client.from("audit_logs").insert({
      organization_id: input.organizationId,
      action: input.auditAction || "invitation_revoked",
      object_type: "invitation",
      object_id: row.id,
      request_meta: { actor_email: input.actorEmail, email: row.email },
    });
  }
  return pending.length;
}

export async function regenerateOrganizationInvitation(input: {
  client: SupabaseClient;
  organizationId: string;
  email: string;
  role: string;
  actorEmail: string;
}): Promise<{ invitationId: string; invitePath: string; inviteUrl: string }> {
  await revokePendingInvitations({
    client: input.client,
    organizationId: input.organizationId,
    email: input.email,
    actorEmail: input.actorEmail,
    auditAction: "invitation_revoked_before_regenerate",
  });
  const created = await createOrganizationInvitation({
    client: input.client,
    organizationId: input.organizationId,
    email: input.email,
    role: input.role,
    actorEmail: input.actorEmail,
    auditAction: "invitation_regenerated",
  });
  return {
    invitationId: created.invitationId,
    invitePath: created.invitePath,
    inviteUrl: created.inviteUrl,
  };
}
