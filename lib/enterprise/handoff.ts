import { getHqSession, writeAuthAudit } from "../dashboard/auth";
import { createEphemeralEnterpriseAnonClient, getEnterpriseServiceClient, getEnterpriseUserClient } from "./client";
import { CUSTOMER_ZERO_SLUG, ENTERPRISE_HANDOFF_TTL_SECONDS } from "./constants";
import { sessionIdFromAccessToken } from "./jwt-claims";
import {
  getActiveIdentityLinkByHqUserId,
  getHandoffSession,
  handoffIsLive,
  recordHandoffSession,
  revokeHandoffSession,
  type IdentityLinkRow,
} from "./identity-links";
import type { EnterpriseMembership } from "./types";

export type MintedHandoff = {
  accessToken: string;
  expiresAt: Date;
  enterpriseUserId: string;
  membership: EnterpriseMembership;
};

async function activeMembershipForUser(
  accessToken: string,
  slug: string
): Promise<EnterpriseMembership | null> {
  const client = getEnterpriseUserClient(accessToken);
  const { data: profile } = await client.from("profiles").select("id").maybeSingle();
  if (!profile?.id) return null;
  const { data: rows } = await client
    .from("organization_memberships")
    .select("role, status, organizations(id, slug, name, kind, plan, is_demo, product_allowance)")
    .eq("user_id", profile.id)
    .eq("status", "active");
  for (const row of rows || []) {
    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
    if (!org?.slug || String(org.slug) !== slug) continue;
    return {
      organizationId: String(org.id),
      slug: String(org.slug),
      name: String(org.name),
      role: String(row.role),
      kind: String(org.kind || ""),
      plan: String(org.plan || ""),
      isDemo: Boolean(org.is_demo),
      productAllowance: org.product_allowance == null ? null : Number(org.product_allowance),
    };
  }
  return null;
}

async function mintGoTrueUserSession(enterpriseUserId: string): Promise<{
  accessToken: string;
  sessionId: string;
}> {
  const admin = getEnterpriseServiceClient();
  if (!admin) throw new Error("Enterprise Auth is not configured.");

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(enterpriseUserId);
  if (userError || !userData.user?.email) {
    throw new Error("Enterprise principal is not active.");
  }
  if (userData.user.banned_until && new Date(userData.user.banned_until).getTime() > Date.now()) {
    throw new Error("Enterprise principal is not active.");
  }

  // Admin generateLink does not send mail. Type is magiclink, never recovery, so this
  // does not start a password-reset flow. hashed_token stays server-side; action_link
  // is discarded. Refresh token is discarded — only a short-lived access JWT is stored.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
  });
  const hashed = linkData?.properties?.hashed_token;
  if (linkError || !hashed) {
    throw new Error(linkError?.message || "Could not issue an Enterprise session.");
  }

  const mintClient = createEphemeralEnterpriseAnonClient();
  const verified = await mintClient.auth.verifyOtp({
    token_hash: hashed,
    type: "email",
  });
  const accessToken = verified.data.session?.access_token;
  if (verified.error || !accessToken) {
    throw new Error(verified.error?.message || "Could not verify the Enterprise session.");
  }
  const sessionId = sessionIdFromAccessToken(accessToken);
  if (!sessionId) {
    await admin.auth.admin.signOut(accessToken, "local").catch(() => undefined);
    throw new Error("Enterprise session did not include a revocable session id.");
  }
  return { accessToken, sessionId };
}

export async function mintStaffEnterpriseHandoff(input: {
  hqUserId: string;
  hqEmail: string;
  slug?: string;
}): Promise<MintedHandoff> {
  const slug = (input.slug || CUSTOMER_ZERO_SLUG).trim().toLowerCase();
  const link = await getActiveIdentityLinkByHqUserId(input.hqUserId);
  if (!link) throw new Error("No approved HQ → Enterprise identity mapping.");

  const admin = getEnterpriseServiceClient();
  if (!admin) throw new Error("Enterprise Auth is not configured.");
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(link.enterprise_user_id);
  if (userError || !userData.user?.id) throw new Error("Enterprise principal is not active.");

  const minted = await mintGoTrueUserSession(link.enterprise_user_id);
  const membership = await activeMembershipForUser(minted.accessToken, slug);
  if (!membership) {
    await admin.auth.admin.signOut(minted.accessToken, "local").catch(() => undefined);
    throw new Error("Enterprise membership is not active for this workspace.");
  }

  const expiresAt = new Date(Date.now() + ENTERPRISE_HANDOFF_TTL_SECONDS * 1000);
  await recordHandoffSession({
    sessionId: minted.sessionId,
    identityLinkId: link.id,
    hqUserId: input.hqUserId,
    enterpriseUserId: link.enterprise_user_id,
    expiresAt,
  });
  await writeAuthAudit({
    authUserId: input.hqUserId,
    email: input.hqEmail,
    eventName: "enterprise_handoff_minted",
    metadata: {
      enterprise_user_id: link.enterprise_user_id,
      organization_slug: slug,
      session_id: minted.sessionId,
      expires_at: expiresAt.toISOString(),
    },
  });
  return {
    accessToken: minted.accessToken,
    expiresAt,
    enterpriseUserId: link.enterprise_user_id,
    membership,
  };
}

export async function requireHandoffStillValid(input: {
  accessToken: string;
  sessionId: string | null;
  enterpriseUserId: string;
}): Promise<{ link: IdentityLinkRow; hqUserId: string } | null> {
  if (!input.sessionId) return null;
  const row = await getHandoffSession(input.sessionId);
  if (!row || !handoffIsLive(row)) return null;
  if (row.enterprise_user_id !== input.enterpriseUserId) return null;
  const hq = await getHqSession();
  if (!hq || hq.authUserId !== row.hq_user_id) return null;
  const link = await getActiveIdentityLinkByHqUserId(hq.authUserId);
  if (!link || link.enterprise_user_id !== input.enterpriseUserId) return null;
  return { link, hqUserId: hq.authUserId };
}

export async function revokeMintedEnterpriseSession(accessToken: string | null): Promise<void> {
  if (!accessToken) return;
  const sessionId = sessionIdFromAccessToken(accessToken);
  if (sessionId) await revokeHandoffSession(sessionId);
  const admin = getEnterpriseServiceClient();
  if (admin) {
    await admin.auth.admin.signOut(accessToken, "local").catch(() => undefined);
  }
}
