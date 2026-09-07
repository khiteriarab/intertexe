import type { User } from "@supabase/supabase-js";
import {
  createEphemeralEnterpriseAnonClient,
  getEnterpriseAnonClient,
  getEnterpriseServiceClient,
  getEnterpriseUserClient,
} from "./client";
import { listEnterpriseMembershipsForUser, resolvePostLoginPath } from "./memberships";
import { loadSsoConfigByOrganizationId } from "./sso-config";
import type {
  EnterpriseSsoProvider,
  OrganizationSsoConfigRow,
  SsoAuthorizationResult,
  SsoProviderClaims,
} from "./sso-types";

export function getEnterpriseSsoCallbackUrl(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/api/auth/sso/callback`;
}

export function extractProviderClaims(
  user: User,
  config: OrganizationSsoConfigRow
): SsoProviderClaims | null {
  const identity =
    user.identities?.find((item) => item.identity_id && item.provider !== "email") ||
    user.identities?.[0];
  const data = (identity?.identity_data || {}) as Record<string, unknown>;
  const subject =
    (typeof data.sub === "string" && data.sub) ||
    (typeof identity?.id === "string" && identity.id) ||
    null;
  const issuer =
    (typeof data.iss === "string" && data.iss) ||
    (typeof config.issuer === "string" && config.issuer) ||
    (typeof identity?.provider === "string" ? identity.provider : null);
  if (!subject || !issuer) return null;
  return {
    issuer,
    subject,
    provider: config.provider,
    email: user.email ? user.email.trim().toLowerCase() : null,
  };
}

async function recordSsoLoginEvent(input: {
  organizationId: string | null;
  authUserId: string | null;
  provider: EnterpriseSsoProvider | null;
  success: boolean;
  failureReason?: string;
}) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return;
  await supabase.from("enterprise_sso_login_events").insert({
    organization_id: input.organizationId,
    auth_user_id: input.authUserId,
    provider: input.provider,
    success: input.success,
    failure_reason: input.failureReason || null,
  });
}

async function upsertSsoIdentity(input: {
  organizationId: string;
  authUserId: string;
  claims: SsoProviderClaims;
}) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) throw new Error("Enterprise database is not configured.");
  const { error } = await supabase.from("enterprise_sso_identities").upsert(
    {
      organization_id: input.organizationId,
      auth_user_id: input.authUserId,
      issuer: input.claims.issuer,
      provider_subject: input.claims.subject,
      provider: input.claims.provider,
      email_at_link: input.claims.email,
      last_login_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,issuer,provider_subject" }
  );
  if (error) throw new Error(error.message);
}

async function membershipActiveForOrganization(
  accessToken: string,
  organizationId: string
): Promise<{ ok: true; slug: string } | { ok: false; reason: string }> {
  const client = getEnterpriseUserClient(accessToken);
  const memberships = await listEnterpriseMembershipsForUser(client, accessToken);
  const match = memberships.find((m) => m.organizationId === organizationId);
  if (!match) {
    return {
      ok: false,
      reason: "No active organization membership for this SSO identity.",
    };
  }
  return { ok: true, slug: match.slug };
}

export async function authorizeEnterpriseSsoSession(input: {
  accessToken: string;
  user: User;
  organizationId: string;
}): Promise<SsoAuthorizationResult> {
  const config = await loadSsoConfigByOrganizationId(input.organizationId);
  if (!config || !config.enabled || config.status !== "active") {
    await recordSsoLoginEvent({
      organizationId: input.organizationId,
      authUserId: input.user.id,
      provider: config?.provider || null,
      success: false,
      failureReason: "sso_not_active",
    });
    return { ok: false, reason: "SSO is not active for this organization.", status: 403 };
  }

  if (config.account_state !== "active") {
    await recordSsoLoginEvent({
      organizationId: input.organizationId,
      authUserId: input.user.id,
      provider: config.provider,
      success: false,
      failureReason: "organization_inactive",
    });
    return { ok: false, reason: "This organization workspace is not active.", status: 403 };
  }

  const claims = extractProviderClaims(input.user, config);
  if (!claims) {
    await recordSsoLoginEvent({
      organizationId: input.organizationId,
      authUserId: input.user.id,
      provider: config.provider,
      success: false,
      failureReason: "missing_provider_claims",
    });
    return { ok: false, reason: "SSO identity could not be verified.", status: 403 };
  }

  const membership = await membershipActiveForOrganization(input.accessToken, input.organizationId);
  if (!membership.ok) {
    await recordSsoLoginEvent({
      organizationId: input.organizationId,
      authUserId: input.user.id,
      provider: config.provider,
      success: false,
      failureReason: "membership_required",
    });
    return { ok: false, reason: membership.reason, status: 403 };
  }

  await upsertSsoIdentity({
    organizationId: input.organizationId,
    authUserId: input.user.id,
    claims,
  });

  await recordSsoLoginEvent({
    organizationId: input.organizationId,
    authUserId: input.user.id,
    provider: config.provider,
    success: true,
  });

  return {
    ok: true,
    organizationId: input.organizationId,
    organizationSlug: membership.slug,
    authUserId: input.user.id,
  };
}

export async function startEnterpriseSsoRedirect(input: {
  organizationId: string;
  callbackOrigin: string;
}): Promise<{ redirectUrl: string } | { error: string; status: number }> {
  const config = await loadSsoConfigByOrganizationId(input.organizationId);
  if (!config || !config.enabled || config.status !== "active") {
    return { error: "SSO is not available for this organization.", status: 404 };
  }

  const auth = getEnterpriseAnonClient();
  if (!auth) return { error: "Enterprise Auth is not configured.", status: 503 };

  const redirectTo = getEnterpriseSsoCallbackUrl(input.callbackOrigin);

  if (config.provider === "saml" && config.sso_domain) {
    const { data, error } = await auth.auth.signInWithSSO({
      domain: config.sso_domain,
      options: { redirectTo: getEnterpriseSsoCompleteUrl(input.callbackOrigin) },
    });
    if (error || !data?.url) {
      return { error: error?.message || "Could not start SSO.", status: 502 };
    }
    return { redirectUrl: data.url };
  }

  const provider = config.oauth_provider_slug || (config.provider === "google_workspace" ? "google" : null);
  if (!provider) {
    return { error: "SSO provider is not fully configured.", status: 503 };
  }

  const { data, error } = await auth.auth.signInWithOAuth({
    provider: provider as "google",
    options: {
      redirectTo,
      queryParams: config.provider === "oidc" ? { prompt: "login" } : undefined,
    },
  });
  if (error || !data?.url) {
    return { error: error?.message || "Could not start SSO.", status: 502 };
  }
  return { redirectUrl: data.url };
}

export async function exchangeEnterpriseSsoCode(input: {
  code: string;
}): Promise<{ accessToken: string; user: User } | { error: string }> {
  const auth = createEphemeralEnterpriseAnonClient();
  const { data, error } = await auth.auth.exchangeCodeForSession(input.code);
  if (error || !data.session?.access_token || !data.user) {
    return { error: error?.message || "SSO session exchange failed." };
  }
  return { accessToken: data.session.access_token, user: data.user };
}

/** Complete SAML/hash-token flow using an already-issued access token. */
export async function authorizeEnterpriseSsoSessionFromToken(input: {
  accessToken: string;
  organizationId: string;
}): Promise<SsoAuthorizationResult> {
  const client = getEnterpriseUserClient(input.accessToken);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return { ok: false, reason: "SSO identity could not be verified.", status: 403 };
  }
  return authorizeEnterpriseSsoSession({
    accessToken: input.accessToken,
    user: data.user,
    organizationId: input.organizationId,
  });
}

export function getEnterpriseSsoCompleteUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/auth/sso/complete`;
}

export function resolveSsoPostLoginRedirect(input: {
  organizationSlug: string;
  next?: string | null;
}): string {
  return resolvePostLoginPath({
    next: input.next,
    hq: false,
    memberships: [
      {
        organizationId: input.organizationSlug,
        slug: input.organizationSlug,
        name: input.organizationSlug,
        role: "read_only",
        kind: "customer",
        plan: "saas",
        isDemo: false,
        productAllowance: null,
      },
    ],
  });
}
