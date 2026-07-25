import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "./crypto";
import { getAdapter, getDefinition } from "./registry";
import type { OAuthProviderId, TokenBundle } from "./types";

type ConnectionRow = {
  id: string;
  workspace_id: string;
  provider: OAuthProviderId;
  status: string;
  account_label: string | null;
  external_account_id: string | null;
  scopes: string[] | null;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
};

function scrubMetadata(meta: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!meta) return {};
  const out = { ...meta };
  delete out.pageAccessToken;
  delete out.privateKeyPem;
  delete out.accessToken;
  delete out.refreshToken;
  return out;
}

export async function upsertConnection(
  supabase: SupabaseClient,
  args: {
    workspaceId: string;
    provider: OAuthProviderId;
    bundle: TokenBundle;
    connectedByInternalUserId?: string | null;
  }
) {
  const now = new Date().toISOString();
  const meta = scrubMetadata(args.bundle.metadata);
  // App Store: keep PEM only in refresh_token_enc.
  let refreshEnc: string | null = null;
  if (args.provider === "app_store_connect" && args.bundle.metadata?.privateKeyPem) {
    refreshEnc = encryptSecret(String(args.bundle.metadata.privateKeyPem));
  } else if (args.bundle.refreshToken) {
    refreshEnc = encryptSecret(args.bundle.refreshToken);
  }

  const row = {
    workspace_id: args.workspaceId,
    provider: args.provider,
    status: "connected",
    account_label: args.bundle.accountLabel || null,
    external_account_id: args.bundle.externalAccountId || null,
    scopes: args.bundle.scopes || [],
    access_token_enc: encryptSecret(args.bundle.accessToken),
    refresh_token_enc: refreshEnc,
    token_type: args.bundle.tokenType || "Bearer",
    expires_at: args.bundle.expiresAt ? args.bundle.expiresAt.toISOString() : null,
    metadata: meta,
    connected_by_internal_user_id: args.connectedByInternalUserId || null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("hq_oauth_connections")
    .upsert(row, { onConflict: "workspace_id,provider" })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);

  await markDataSources(supabase, args.workspaceId, args.provider, "connected");
  return data as ConnectionRow;
}

export async function markDataSources(
  supabase: SupabaseClient,
  workspaceId: string,
  provider: OAuthProviderId,
  status: "connected" | "not_connected" | "error" | "degraded"
) {
  const def = getDefinition(provider);
  if (!def) return;
  const labels: Record<string, string> = {
    google_analytics: "Google Analytics",
    search_console: "Search Console",
    instagram: "Instagram",
    tiktok: "TikTok",
    pinterest: "Pinterest",
    app_store_connect: "App Store Connect",
  };
  for (const key of def.dataSourceKeys) {
    await supabase.from("hq_data_sources").upsert(
      {
        workspace_id: workspaceId,
        key,
        label: labels[key] || key,
        status,
        sync_frequency: "daily",
        updated_at: new Date().toISOString(),
        ...(status === "connected"
          ? { last_success_at: new Date().toISOString(), error_message: null }
          : {}),
      },
      { onConflict: "workspace_id,key" }
    );
  }
}

export async function listConnections(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase
    .from("hq_oauth_connections")
    .select(
      "id, provider, status, account_label, external_account_id, scopes, expires_at, metadata, last_sync_at, last_sync_status, last_sync_error, updated_at"
    )
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
  return (data || []) as Array<{
    id: string;
    provider: string;
    status: string;
    account_label: string | null;
    external_account_id: string | null;
    scopes: string[] | null;
    expires_at: string | null;
    metadata: Record<string, unknown> | null;
    last_sync_at: string | null;
    last_sync_status: string | null;
    last_sync_error: string | null;
    updated_at: string;
  }>;
}

export async function disconnectConnection(
  supabase: SupabaseClient,
  workspaceId: string,
  provider: OAuthProviderId
) {
  await supabase
    .from("hq_oauth_connections")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("provider", provider);
  await markDataSources(supabase, workspaceId, provider, "not_connected");
}

async function loadFullConnection(
  supabase: SupabaseClient,
  workspaceId: string,
  provider: OAuthProviderId
): Promise<ConnectionRow | null> {
  const { data, error } = await supabase
    .from("hq_oauth_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ConnectionRow) || null;
}

/** Returns a valid access token, refreshing when needed. */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  workspaceId: string,
  provider: OAuthProviderId
): Promise<{ accessToken: string; metadata: Record<string, unknown>; connection: ConnectionRow }> {
  const row = await loadFullConnection(supabase, workspaceId, provider);
  if (!row || !row.access_token_enc) throw new Error("Integration not connected");

  const metadata = { ...(row.metadata || {}) };
  if (provider === "app_store_connect") {
    if (row.refresh_token_enc) {
      metadata.privateKeyPem = decryptSecret(row.refresh_token_enc);
    }
    return { accessToken: "asc-key-stored", metadata, connection: row };
  }

  let accessToken = decryptSecret(row.access_token_enc);
  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : 0;
  const needsRefresh = expiresAt && expiresAt < Date.now() + 5 * 60 * 1000;

  if (needsRefresh && row.refresh_token_enc) {
    const adapter = getAdapter(provider);
    if (!adapter.refreshAccessToken) throw new Error("Token expired and provider cannot refresh");
    const refreshToken = decryptSecret(row.refresh_token_enc);
    const refreshed = await adapter.refreshAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    await supabase
      .from("hq_oauth_connections")
      .update({
        access_token_enc: encryptSecret(refreshed.accessToken),
        refresh_token_enc: refreshed.refreshToken
          ? encryptSecret(refreshed.refreshToken)
          : row.refresh_token_enc,
        expires_at: refreshed.expiresAt ? refreshed.expiresAt.toISOString() : row.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }

  return { accessToken, metadata, connection: row };
}

export async function syncProvider(
  supabase: SupabaseClient,
  workspaceId: string,
  provider: OAuthProviderId
) {
  const adapter = getAdapter(provider);
  const { accessToken, metadata, connection } = await getValidAccessToken(
    supabase,
    workspaceId,
    provider
  );

  if (!adapter.syncMetrics) {
    await supabase
      .from("hq_oauth_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "success",
        last_sync_error: null,
      })
      .eq("id", connection.id);
    return { ok: true, metrics: {} };
  }

  try {
    // Meta: resolve page token at sync time (never persist plaintext).
    if (provider === "meta" && !metadata.pageAccessToken && metadata.igUserId) {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,access_token,instagram_business_account{id}&access_token=${encodeURIComponent(accessToken)}`
      );
      const pages = await pagesRes.json();
      const match = (pages.data || []).find(
        (p: { instagram_business_account?: { id?: string }; access_token?: string }) =>
          p.instagram_business_account?.id === metadata.igUserId
      );
      if (match?.access_token) metadata.pageAccessToken = match.access_token;
    }

    const result = await adapter.syncMetrics({ accessToken, metadata });
    const metricDate = new Date().toISOString().slice(0, 10);
    await supabase.from("hq_integration_metric_snapshots").upsert(
      {
        workspace_id: workspaceId,
        provider,
        metric_date: metricDate,
        metrics: result.metrics,
        raw: result.raw || {},
      },
      { onConflict: "workspace_id,provider,metric_date" }
    );
    await supabase
      .from("hq_oauth_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "success",
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    await markDataSources(supabase, workspaceId, provider, "connected");
    return { ok: true, metrics: result.metrics };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("hq_oauth_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: message.slice(0, 500),
        status: "degraded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    await markDataSources(supabase, workspaceId, provider, "degraded");
    return { ok: false, error: message };
  }
}
