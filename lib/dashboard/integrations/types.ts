export type OAuthProviderId =
  | "google"
  | "gmail"
  | "meta"
  | "tiktok"
  | "pinterest"
  | "app_store_connect"
  | "chrome_web_store";

export type IntegrationAuthMode = "oauth" | "api_key";

export type IntegrationDefinition = {
  id: OAuthProviderId;
  label: string;
  /** Keys updated in hq_data_sources when this connection succeeds. */
  dataSourceKeys: string[];
  authMode: IntegrationAuthMode;
  description: string;
  docsUrl?: string;
  /** Env vars required for the INTERTEXE app registration (not user keys). */
  requiredEnv: string[];
};

export type TokenBundle = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  tokenType?: string;
  scopes?: string[];
  accountLabel?: string | null;
  externalAccountId?: string | null;
  metadata?: Record<string, unknown>;
};

export type ProviderAdapter = {
  id: OAuthProviderId;
  isConfigured(): boolean;
  getAuthorizationUrl(args: { state: string; redirectUri: string }): string;
  exchangeCode(args: {
    code: string;
    redirectUri: string;
  }): Promise<TokenBundle>;
  refreshAccessToken?(refreshToken: string): Promise<TokenBundle>;
  /** Optional post-connect enrichment (account name, property list). */
  enrichAccount?(accessToken: string): Promise<Partial<TokenBundle>>;
  /** Pull a daily metrics snapshot. Returns metrics object. */
  syncMetrics?(args: {
    accessToken: string;
    metadata: Record<string, unknown>;
  }): Promise<{ metrics: Record<string, unknown>; raw?: Record<string, unknown> }>;
};
