import { getEnterpriseServiceClient } from "./client";
import type { OrganizationSsoConfigRow, SsoDiscoveryPublicResult, SsoDiscoveryResult } from "./sso-types";

export function normalizeEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain && domain.includes(".") ? domain : null;
}

function isConfigRoutable(row: OrganizationSsoConfigRow): boolean {
  return row.enabled && row.status === "active";
}

export async function loadSsoConfigByOrganizationId(
  organizationId: string
): Promise<(OrganizationSsoConfigRow & { slug: string; name: string; account_state: string }) | null> {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("organization_sso_configs")
    .select(
      "id, organization_id, enabled, provider, status, sso_domain, oauth_provider_slug, issuer, allowed_email_domains, enforce_sso, allow_password_fallback, provider_label, organizations!inner(slug, name, account_state)"
    )
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) return null;
  const org = Array.isArray(data.organizations) ? data.organizations[0] : data.organizations;
  if (!org?.slug) return null;
  const { organizations: _org, ...config } = data;
  return {
    ...(config as OrganizationSsoConfigRow),
    slug: String(org.slug),
    name: String(org.name),
    account_state: String(org.account_state),
  };
}

export async function discoverSsoByEmail(email: string): Promise<SsoDiscoveryResult> {
  const domain = normalizeEmailDomain(email);
  if (!domain) return { ssoAvailable: false };

  const supabase = getEnterpriseServiceClient();
  if (!supabase) return { ssoAvailable: false };

  const { data: domainRow } = await supabase
    .from("organization_sso_domains")
    .select("organization_id, sso_config_id")
    .eq("domain", domain)
    .maybeSingle();
  if (!domainRow?.organization_id) return { ssoAvailable: false };

  const loaded = await loadSsoConfigByOrganizationId(domainRow.organization_id);
  if (!loaded || !isConfigRoutable(loaded)) return { ssoAvailable: false };

  return {
    ssoAvailable: true,
    organizationId: loaded.organization_id,
    organizationSlug: loaded.slug,
    organizationName: loaded.name,
    enforceSso: loaded.enforce_sso,
    allowPasswordFallback: loaded.allow_password_fallback,
    providerLabel: loaded.provider_label || providerDisplayName(loaded.provider),
  };
}

export async function discoverSsoByDomain(domain: string): Promise<SsoDiscoveryResult> {
  return discoverSsoByEmail(`probe@${domain.trim().toLowerCase()}`);
}

/** Strip internal identifiers before returning discovery to the browser. */
export function toPublicSsoDiscovery(discovery: SsoDiscoveryResult): SsoDiscoveryPublicResult {
  if (!discovery.ssoAvailable) return { ssoAvailable: false };
  return {
    ssoAvailable: true,
    ssoRequired: Boolean(discovery.enforceSso),
    passwordAllowed: discovery.allowPasswordFallback !== false,
    providerLabel: discovery.providerLabel,
  };
}

export function providerDisplayName(provider: OrganizationSsoConfigRow["provider"]): string {
  switch (provider) {
    case "google_workspace":
      return "Google Workspace";
    case "oidc":
      return "Single sign-on";
    case "saml":
    default:
      return "Enterprise SSO";
  }
}

export function ssoConfigPublicView(
  config: OrganizationSsoConfigRow & { slug?: string; name?: string }
) {
  return {
    enabled: config.enabled,
    status: config.status,
    provider: config.provider,
    providerLabel: config.provider_label || providerDisplayName(config.provider),
    allowedEmailDomains: config.allowed_email_domains,
    enforceSso: config.enforce_sso,
    allowPasswordFallback: config.allow_password_fallback,
    hasSsoDomain: Boolean(config.sso_domain),
    hasOAuthProvider: Boolean(config.oauth_provider_slug),
    issuer: config.issuer,
    organizationSlug: config.slug,
    organizationName: config.name,
  };
}

export async function passwordLoginBlockedForEmail(email: string): Promise<{
  blocked: boolean;
  message?: string;
  discovery?: SsoDiscoveryResult;
}> {
  const discovery = await discoverSsoByEmail(email);
  if (!discovery.ssoAvailable || !discovery.enforceSso || discovery.allowPasswordFallback) {
    return { blocked: false, discovery };
  }
  return {
    blocked: true,
    discovery,
    message: "This organization requires SSO. Use Continue with SSO to sign in.",
  };
}
