export type EnterpriseSsoProvider = "saml" | "oidc" | "google_workspace";
export type EnterpriseSsoStatus = "draft" | "active" | "disabled";

export type OrganizationSsoConfigRow = {
  id: string;
  organization_id: string;
  enabled: boolean;
  provider: EnterpriseSsoProvider;
  status: EnterpriseSsoStatus;
  sso_domain: string | null;
  oauth_provider_slug: string | null;
  issuer: string | null;
  allowed_email_domains: string[];
  enforce_sso: boolean;
  allow_password_fallback: boolean;
  provider_label: string | null;
};

/** Internal discovery — may include organizationId for server-side SSO start. */
export type SsoDiscoveryResult = {
  ssoAvailable: boolean;
  organizationId?: string;
  organizationSlug?: string;
  organizationName?: string;
  enforceSso?: boolean;
  allowPasswordFallback?: boolean;
  providerLabel?: string;
};

/** Public discovery response — minimal UX fields only. */
export type SsoDiscoveryPublicResult = {
  ssoAvailable: boolean;
  ssoRequired?: boolean;
  passwordAllowed?: boolean;
  providerLabel?: string;
};

export type SsoProviderClaims = {
  issuer: string;
  subject: string;
  provider: EnterpriseSsoProvider;
  email: string | null;
};

export type SsoAuthorizationResult =
  | { ok: true; organizationId: string; organizationSlug: string; authUserId: string }
  | { ok: false; reason: string; status: number };
