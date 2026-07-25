import type { IntegrationDefinition, OAuthProviderId, ProviderAdapter } from "./types";
import { googleAdapter } from "./providers/google";
import { metaAdapter } from "./providers/meta";
import { tiktokAdapter } from "./providers/tiktok";
import { pinterestAdapter } from "./providers/pinterest";
import { appStoreConnectAdapter } from "./providers/app-store-connect";

export const INTEGRATION_DEFINITIONS: IntegrationDefinition[] = [
  {
    id: "google",
    label: "Google (Analytics + Search Console)",
    dataSourceKeys: ["google_analytics", "search_console"],
    authMode: "oauth",
    description:
      "Connect once with your Google account to pull GA4 traffic and Search Console query data nightly.",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    requiredEnv: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
  },
  {
    id: "meta",
    label: "Instagram (Meta)",
    dataSourceKeys: ["instagram"],
    authMode: "oauth",
    description:
      "Sign in with Meta / Facebook to connect the INTERTEXE Instagram professional account and pull insights.",
    docsUrl: "https://developers.facebook.com/apps/",
    requiredEnv: ["META_OAUTH_APP_ID", "META_OAUTH_APP_SECRET"],
  },
  {
    id: "tiktok",
    label: "TikTok",
    dataSourceKeys: ["tiktok"],
    authMode: "oauth",
    description: "Connect TikTok for Business / Login Kit to pull account and performance metrics.",
    docsUrl: "https://developers.tiktok.com/",
    requiredEnv: ["TIKTOK_OAUTH_CLIENT_KEY", "TIKTOK_OAUTH_CLIENT_SECRET"],
  },
  {
    id: "pinterest",
    label: "Pinterest",
    dataSourceKeys: ["pinterest"],
    authMode: "oauth",
    description: "Connect your Pinterest Business account via OAuth for pins and ad performance.",
    docsUrl: "https://developers.pinterest.com/",
    requiredEnv: ["PINTEREST_OAUTH_APP_ID", "PINTEREST_OAUTH_APP_SECRET"],
  },
  {
    id: "app_store_connect",
    label: "App Store Connect",
    dataSourceKeys: ["app_store_connect"],
    authMode: "api_key",
    description:
      "Apple does not offer user OAuth for App Store Connect Analytics API. Upload a team API key (.p8) once; HQ stores it encrypted and refreshes JWTs automatically.",
    docsUrl: "https://appstoreconnect.apple.com/access/integrations/api",
    requiredEnv: [],
  },
];

const ADAPTERS: Record<OAuthProviderId, ProviderAdapter> = {
  google: googleAdapter,
  meta: metaAdapter,
  tiktok: tiktokAdapter,
  pinterest: pinterestAdapter,
  app_store_connect: appStoreConnectAdapter,
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
