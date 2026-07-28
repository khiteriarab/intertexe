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
    if (def.id === "tiktok") {
      const sandboxMode = String(process.env.TIKTOK_USE_SANDBOX || "") === "1";
      setupHints.push(
        `Register redirect URI: ${callbackUrl("tiktok")}`
      );
      setupHints.push(
        "Request scopes: user.info.basic, user.info.profile, user.info.stats, video.list. Stats fields appear after TikTok approves them."
      );
      setupHints.push(
        sandboxMode
          ? "Sandbox mode ON: uses TIKTOK_SANDBOX_CLIENT_KEY / TIKTOK_SANDBOX_CLIENT_SECRET when present."
          : "Sandbox mode OFF: set TIKTOK_USE_SANDBOX=1 for review/demo recording before production approval."
      );
      setupHints.push(
        "In TikTok Developer Portal Sandbox, add your TikTok account under Target users before testing Connect."
      );
    }
    if (def.id === "pinterest") {
      setupHints.push(
        `Register redirect URI: ${callbackUrl("pinterest")}`
      );
      setupHints.push(
        "Request scopes: user_accounts:read, pins:read, boards:read (organic analytics)."
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
      TIKTOK_SANDBOX_CLIENT_KEY: Boolean(process.env.TIKTOK_SANDBOX_CLIENT_KEY?.trim()),
      TIKTOK_SANDBOX_CLIENT_SECRET: Boolean(process.env.TIKTOK_SANDBOX_CLIENT_SECRET?.trim()),
      TIKTOK_USE_SANDBOX: String(process.env.TIKTOK_USE_SANDBOX || "") === "1",
      PINTEREST_OAUTH_APP_ID: Boolean(
        process.env.PINTEREST_OAUTH_APP_ID?.trim() || process.env.PINTEREST_APP_ID?.trim()
      ),
      PINTEREST_OAUTH_APP_SECRET: Boolean(
        process.env.PINTEREST_OAUTH_APP_SECRET?.trim() || process.env.PINTEREST_APP_SECRET?.trim()
      ),
    },
  });
}
