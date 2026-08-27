import type { IntegrationDefinition, OAuthProviderId, ProviderAdapter } from "./types";
import { googleAdapter } from "./providers/google";
import { gmailAdapter } from "./providers/gmail";
import { metaAdapter } from "./providers/meta";
import { tiktokAdapter } from "./providers/tiktok";
import { pinterestAdapter } from "./providers/pinterest";
import { appStoreConnectAdapter } from "./providers/app-store-connect";
import { chromeWebStoreAdapter } from "./providers/chrome-web-store";

export const INTEGRATION_DEFINITIONS: IntegrationDefinition[] = [
  {
    id: "google",
    label: "Google (Analytics + Search Console)",
    dataSourceKeys: ["google_analytics", "search_console"],
    authMode: "oauth",
    description:
      "Connect once with your Google account to pull GA4 traffic and Search Console query data nightly.",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    requiredEnv: [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "HQ_TOKEN_ENCRYPTION_KEY",
    ],
  },
  {
    id: "gmail",
    label: "Gmail outreach",
    dataSourceKeys: ["gmail_outreach"],
    authMode: "oauth",
    description:
      "Connect khiteri@intertexe.com for outreach logging and Prepare drafts (Gmail drafts only — never auto-send).",
    docsUrl: "https://console.cloud.google.com/apis/library/gmail.googleapis.com",
    requiredEnv: [
      "GMAIL_OAUTH_CLIENT_ID|GOOGLE_OAUTH_CLIENT_ID",
      "GMAIL_OAUTH_CLIENT_SECRET|GOOGLE_OAUTH_CLIENT_SECRET",
      "HQ_TOKEN_ENCRYPTION_KEY",
    ],
  },
  {
    id: "meta",
    label: "Instagram (Meta)",
    dataSourceKeys: ["instagram"],
    authMode: "oauth",
    description:
      "Sign in with Meta / Facebook for Instagram follower growth and Meta Ads spend (requires ads_read + META_ADS_ACCOUNT_ID).",
    docsUrl: "https://developers.facebook.com/apps/",
    requiredEnv: ["META_OAUTH_APP_ID", "META_OAUTH_APP_SECRET", "HQ_TOKEN_ENCRYPTION_KEY"],
  },
  {
    id: "tiktok",
    label: "TikTok",
    dataSourceKeys: ["tiktok"],
    authMode: "oauth",
    description:
      "TikTok Login Kit is not available for HQ (TikTok rejects internal brand dashboards). Paid spend uses TIKTOK_ADS_* after the For Business app is approved.",
    docsUrl: "https://developers.tiktok.com/doc/login-kit-web",
    requiredEnv: [
      "TIKTOK_OAUTH_CLIENT_KEY",
      "TIKTOK_OAUTH_CLIENT_SECRET",
      "HQ_TOKEN_ENCRYPTION_KEY",
    ],
  },
  {
    id: "pinterest",
    label: "Pinterest",
    dataSourceKeys: ["pinterest"],
    authMode: "oauth",
    description:
      "Connect Pinterest Business via OAuth for organic pin analytics (impressions, clicks, saves).",
    docsUrl: "https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/",
    requiredEnv: [
      // Either OAuth-prefixed or short alias is enough (see isConfigured / providers/pinterest).
      "PINTEREST_OAUTH_APP_ID|PINTEREST_APP_ID",
      "PINTEREST_OAUTH_APP_SECRET|PINTEREST_APP_SECRET",
      "HQ_TOKEN_ENCRYPTION_KEY",
    ],
  },
  {
    id: "app_store_connect",
    label: "App Store Connect",
    dataSourceKeys: ["app_store_connect"],
    authMode: "api_key",
    description:
      "Apple does not offer user OAuth for App Store Connect Analytics API. Upload a team API key (.p8) once; HQ stores it encrypted and refreshes JWTs automatically.",
    docsUrl: "https://appstoreconnect.apple.com/access/integrations/api",
    requiredEnv: ["HQ_TOKEN_ENCRYPTION_KEY"],
  },
  {
    id: "chrome_web_store",
    label: "Chrome Web Store",
    dataSourceKeys: ["chrome_web_store"],
    authMode: "api_key",
    description:
      "Chrome Web Store has no public installs API. Connect the live listing to snapshot first-party extension saves and clickouts. Optionally paste weekly users/installs from the publisher dashboard — website Add to Chrome clicks are not installs.",
    docsUrl: "https://chrome.google.com/webstore/devconsole",
    requiredEnv: ["HQ_TOKEN_ENCRYPTION_KEY"],
  },
];

/** UI cards shown in Settings → Integrations (Google OAuth powers two cards). */
export type IntegrationCardDef = {
  cardId: string;
  label: string;
  providerId: OAuthProviderId;
  permissions: string[];
  blurb: string;
};

export const INTEGRATION_CARDS: IntegrationCardDef[] = [
  {
    cardId: "google_analytics",
    label: "Google Analytics",
    providerId: "google",
    permissions: ["Sessions", "Users", "Page views", "Traffic sources (via GA4 property)"],
    blurb: "Nightly GA4 report for the INTERTEXE property.",
  },
  {
    cardId: "search_console",
    label: "Google Search Console",
    providerId: "google",
    permissions: ["Search clicks", "Impressions", "Top queries", "Average position"],
    blurb: "Nightly Search Console query performance for www.intertexe.com.",
  },
  {
    cardId: "gmail_outreach",
    label: "Gmail outreach",
    providerId: "gmail",
    permissions: ["Sent headers", "Reply headers", "Create drafts", "Message ids", "No auto-send"],
    blurb:
      "Connect the INTERTEXE Gmail that sends outreach. Matching hq_contacts are logged automatically. Prepare drafts creates Gmail drafts only — never auto-sends.",
  },
  {
    cardId: "instagram",
    label: "Instagram",
    providerId: "meta",
    permissions: [
      "Profile",
      "Followers",
      "Posts",
      "Meta Ads spend",
      "Impressions",
      "Clicks",
    ],
    blurb: "Connect via Meta Login for Instagram follower growth and Ads Manager spend.",
  },
  {
    cardId: "tiktok",
    label: "TikTok",
    providerId: "tiktok",
    permissions: [
      "Profile",
      "Followers (when approved)",
      "Video list",
      "Views",
      "Likes",
      "Comments",
      "Shares",
      "Ads spend (with TIKTOK_ADS_* env)",
    ],
    blurb: "Organic Login Kit is blocked by TikTok policy. Paid ads token still feeds Acquisition spend when set.",
  },
  {
    cardId: "pinterest",
    label: "Pinterest",
    providerId: "pinterest",
    permissions: ["Profile", "Impressions", "Pin clicks", "Outbound clicks", "Saves", "Top pins"],
    blurb: "Organic Pinterest analytics — feeds Today, Acquisition, and Action Center (no separate Pinterest page).",
  },
  {
    cardId: "app_store_connect",
    label: "App Store Connect",
    providerId: "app_store_connect",
    permissions: ["App Units (downloads)", "Sales SUMMARY daily reports", "Apps list"],
    blurb: "Upload a team .p8 API key + Vendor Number — downloads feed Acquisition and Today.",
  },
  {
    cardId: "chrome_web_store",
    label: "Chrome Web Store",
    providerId: "chrome_web_store",
    permissions: [
      "Listing URL",
      "First-party extension saves",
      "Extension clickouts",
      "Weekly users (pasted)",
      "Weekly installs (pasted)",
    ],
    blurb:
      "Connect the INTERTEXE Fabric Scanner listing — first-party saves feed Acquisition, Today, and Command Center.",
  },
];

const ADAPTERS: Record<OAuthProviderId, ProviderAdapter> = {
  google: googleAdapter,
  gmail: gmailAdapter,
  meta: metaAdapter,
  tiktok: tiktokAdapter,
  pinterest: pinterestAdapter,
  app_store_connect: appStoreConnectAdapter,
  chrome_web_store: chromeWebStoreAdapter,
};

export function getAdapter(provider: OAuthProviderId): ProviderAdapter {
  const a = ADAPTERS[provider];
  if (!a) throw new Error(`Unknown provider: ${provider}`);
  return a;
}

export function getDefinition(provider: OAuthProviderId): IntegrationDefinition | undefined {
  return INTEGRATION_DEFINITIONS.find((d) => d.id === provider);
}

export function isValidProvider(id: string): id is OAuthProviderId {
  return id in ADAPTERS;
}

export function oauthRedirectBase(): string {
  return (
    process.env.HQ_OAUTH_REDIRECT_BASE ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.intertexe.com"
  ).replace(/\/$/, "");
}

export function callbackUrl(provider: OAuthProviderId): string {
  return `${oauthRedirectBase()}/api/dashboard/integrations/callback/${provider}`;
}

/** Auth / revoke failures that should surface Reconnect in HQ.
 * Do NOT treat short-lived access-token expiry as reconnect — providers
 * (esp. Google ~1h tokens) refresh automatically via refresh_token.
 */
export function needsReconnect(
  conn: {
    status?: string | null;
    expires_at?: string | null;
    last_sync_status?: string | null;
    last_sync_error?: string | null;
    hasRefreshToken?: boolean | null;
  } | null
): boolean {
  if (!conn) return false;
  if (conn.status === "revoked") return true;

  const err = String(conn.last_sync_error || "");
  const authError =
    /invalid_grant|token.?revoked|refresh.?token.*(expired|invalid|revoked)|unauthorized_client|access_denied|login.?required|consent.?required/i.test(
      err
    );

  // Real auth failure on last sync — user must re-consent.
  if (authError) return true;
  if (conn.last_sync_status === "error" && /invalid_grant|revoked|unauthorized|401|403/i.test(err)) {
    return true;
  }

  // Access token expired with no refresh token on file (cannot silent-refresh).
  const accessExpired =
    Boolean(conn.expires_at) && Date.parse(String(conn.expires_at)) < Date.now() - 60_000;
  if (accessExpired && conn.hasRefreshToken === false) return true;

  // Degraded/error status alone is not reconnect — that is often a metrics API issue.
  // Only force reconnect when status is explicitly revoked (handled above) or authError.
  return false;
}

export function formatLastSyncUtc(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    const d = new Date(iso);
    const date = d.toISOString().slice(0, 10);
    const time = d.toISOString().slice(11, 16);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayLabel = date === today ? "Today" : date === yesterday ? "Yesterday" : date;
    return `${dayLabel} at ${time} UTC`;
  } catch {
    return "Unknown";
  }
}
