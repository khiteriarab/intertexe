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
    const missingEnv = def.requiredEnv.filter((k) => !process.env[k]?.trim());
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
      setupHints.push(
        "Register redirect URI exactly as shown below in TikTok Developer Portal (Login Kit)."
      );
      setupHints.push(
        "Request scopes: user.info.basic, user.info.profile, user.info.stats, video.list. Stats fields appear after TikTok approves them."
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
    },
  });
}
