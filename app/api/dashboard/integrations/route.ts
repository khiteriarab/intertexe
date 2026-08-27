import { NextResponse } from "next/server";
import { requireHqSession } from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import { listConnections } from "../../../../lib/dashboard/integrations/connections";
import {
  INTEGRATION_CARDS,
  INTEGRATION_DEFINITIONS,
  callbackUrl,
  formatLastSyncUtc,
  getAdapter,
  getDefinition,
  needsReconnect,
} from "../../../../lib/dashboard/integrations/registry";

export const dynamic = "force-dynamic";

/** Env specs may be `NAME` or `NAME_A|NAME_B` (any alias present is enough). */
function envConfigured(spec: string): boolean {
  return spec
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((key) => Boolean(process.env[key]?.trim()));
}

function missingEnvLabel(spec: string): string {
  const parts = spec
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.join(" or ") : parts[0] || spec;
}

export async function GET() {
  const session = await requireHqSession();
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const connections = await listConnections(supabase, session.workspaceId);
  const byProvider = new Map(connections.map((c) => [c.provider, c]));
  const encryptionConfigured = Boolean(process.env.HQ_TOKEN_ENCRYPTION_KEY?.trim());
  const ga4Configured = Boolean(process.env.GA4_PROPERTY_ID?.trim());
  const gscConfigured = Boolean(process.env.SEARCH_CONSOLE_SITE_URL?.trim());

  const providers = INTEGRATION_DEFINITIONS.map((def) => {
    const adapter = getAdapter(def.id);
    const conn = byProvider.get(def.id) || null;
    const missingEnv = def.requiredEnv.filter((k) => !envConfigured(k)).map(missingEnvLabel);
    const reconnect = needsReconnect(conn);
    const linked =
      Boolean(conn) &&
      (conn!.status === "connected" || conn!.status === "degraded" || conn!.status === "error");
    const setupHints: string[] = [];
    if (def.id === "google") {
      if (!ga4Configured) {
        setupHints.push("Add GA4_PROPERTY_ID in Vercel Production (numeric property ID).");
      }
      if (!gscConfigured) {
        setupHints.push(
          "SEARCH_CONSOLE_SITE_URL unset — sync defaults to sc-domain:intertexe.com."
        );
      }
    }
    if (def.id === "meta") {
      setupHints.push(`Register redirect URI: ${callbackUrl("meta")}`);
      setupHints.push(
        "Request scopes: pages_show_list, pages_read_engagement, business_management, ads_read."
      );
      setupHints.push(
        "Set META_ADS_ACCOUNT_ID in Vercel (act_XXXXX from Meta Ads Manager → Settings → Account)."
      );
      setupHints.push(
        "After adding ads_read, disconnect and reconnect Meta in HQ so the token includes Ads access."
      );
    }
    if (def.id === "tiktok") {
      setupHints.push(`Register redirect URI: ${callbackUrl("tiktok")}`);
      setupHints.push(
        "Production Login Kit only — set TIKTOK_OAUTH_CLIENT_KEY + TIKTOK_OAUTH_CLIENT_SECRET in Vercel (remove TIKTOK_USE_SANDBOX and sandbox keys)."
      );
      setupHints.push(
        "Request scopes: user.info.basic, user.info.profile, user.info.stats, video.list. Follower count needs user.info.stats approved on your TikTok app."
      );
      setupHints.push(
        "After switching to production keys, disconnect and reconnect TikTok in HQ so the token includes stats."
      );
      setupHints.push(
        "For paid ads on Acquisition: set TIKTOK_ADS_ACCESS_TOKEN + TIKTOK_ADS_ADVERTISER_ID in Vercel (from TikTok Ads Manager → Tools → Events/API)."
      );
    }
    if (def.id === "gmail") {
      setupHints.push(`Register redirect URI: ${callbackUrl("gmail")}`);
      setupHints.push("Enable Gmail API on the existing Google Cloud project.");
      setupHints.push("Connect as khiteri@intertexe.com (the sending account), not the GA/GSC login.");
      setupHints.push("Read-only: sent/reply headers for people already in hq_contacts. Bodies are never stored.");
    }
    if (def.id === "pinterest") {
      setupHints.push(`Register redirect URI: ${callbackUrl("pinterest")}`);
      setupHints.push("Request scopes: user_accounts:read, pins:read, boards:read (organic analytics).");
    }
    if (def.id === "chrome_web_store") {
      setupHints.push(
        "Chrome Web Store has no public installs API. Connecting snapshots first-party extension saves and clickouts."
      );
      setupHints.push(
        "Optional: paste Weekly users / Weekly installs from the Chrome Web Store developer dashboard. Website Add to Chrome clicks are not installs."
      );
    }
    if (!encryptionConfigured) {
      setupHints.push("Add HQ_TOKEN_ENCRYPTION_KEY in Vercel Production before connecting.");
    }
    const meta = (conn?.metadata || {}) as Record<string, unknown>;
    const lastSuccessfulSyncAt =
      typeof meta.lastSuccessfulSyncAt === "string" ? meta.lastSuccessfulSyncAt : null;
    return {
      id: def.id,
      label: def.label,
      authMode: def.authMode,
      appConfigured: adapter.isConfigured() && missingEnv.length === 0,
      missingEnv,
      callbackUrl: def.authMode === "oauth" ? callbackUrl(def.id) : null,
      needsReconnect: reconnect,
      setupHints,
      connection: conn
        ? {
            status: conn.status,
            accountLabel: conn.account_label,
            expiresAt: conn.expires_at,
            lastSyncAt: conn.last_sync_at,
            lastSyncLabel: formatLastSyncUtc(conn.last_sync_at),
            lastSuccessfulSyncAt,
            lastSuccessfulSyncLabel: formatLastSyncUtc(lastSuccessfulSyncAt),
            lastSyncStatus: conn.last_sync_status,
            lastSyncError: conn.last_sync_error,
            listingId: typeof meta.listingId === "string" ? meta.listingId : null,
            weeklyUsers: typeof meta.weeklyUsers === "number" ? meta.weeklyUsers : null,
            weeklyInstalls: typeof meta.weeklyInstalls === "number" ? meta.weeklyInstalls : null,
          }
        : null,
      displayStatus: !linked
        ? "not_connected"
        : reconnect
          ? "needs_reconnect"
          : conn!.last_sync_status === "error"
            ? "sync_error"
            : conn!.last_sync_status === "warning"
              ? "setup_warning"
              : "connected",
    };
  });

  const byProviderMeta = new Map(providers.map((p) => [p.id, p]));

  const cards = INTEGRATION_CARDS.map((card) => {
    const provider = byProviderMeta.get(card.providerId)!;
    const def = getDefinition(card.providerId)!;
    return {
      cardId: card.cardId,
      label: card.label,
      blurb: card.blurb,
      permissions: card.permissions,
      providerId: card.providerId,
      authMode: def.authMode,
      appConfigured: provider.appConfigured,
      missingEnv: provider.missingEnv,
      callbackUrl: provider.callbackUrl,
      needsReconnect: provider.needsReconnect,
      setupHints: provider.setupHints,
      displayStatus: provider.displayStatus,
      connection: provider.connection,
    };
  });

  return NextResponse.json({
    cards,
    providers,
    envPresence: {
      HQ_TOKEN_ENCRYPTION_KEY: encryptionConfigured,
      GA4_PROPERTY_ID: ga4Configured,
      SEARCH_CONSOLE_SITE_URL: gscConfigured,
      GOOGLE_OAUTH_CLIENT_ID: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()),
      GOOGLE_OAUTH_CLIENT_SECRET: Boolean(process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()),
      TIKTOK_OAUTH_CLIENT_KEY: Boolean(process.env.TIKTOK_OAUTH_CLIENT_KEY?.trim()),
      TIKTOK_OAUTH_CLIENT_SECRET: Boolean(process.env.TIKTOK_OAUTH_CLIENT_SECRET?.trim()),
      PINTEREST_OAUTH_APP_ID: Boolean(
        process.env.PINTEREST_OAUTH_APP_ID?.trim() || process.env.PINTEREST_APP_ID?.trim()
      ),
      PINTEREST_OAUTH_APP_SECRET: Boolean(
        process.env.PINTEREST_OAUTH_APP_SECRET?.trim() || process.env.PINTEREST_APP_SECRET?.trim()
      ),
      META_ADS_ACCOUNT_ID: Boolean(process.env.META_ADS_ACCOUNT_ID?.trim()),
      TIKTOK_ADS_ACCESS_TOKEN: Boolean(process.env.TIKTOK_ADS_ACCESS_TOKEN?.trim()),
      TIKTOK_ADS_ADVERTISER_ID: Boolean(process.env.TIKTOK_ADS_ADVERTISER_ID?.trim()),
    },
  });
}
