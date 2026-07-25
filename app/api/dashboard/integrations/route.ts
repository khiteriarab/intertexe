import { NextResponse } from "next/server";
import { requireHqSession } from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import { listConnections } from "../../../../lib/dashboard/integrations/connections";
import { INTEGRATION_DEFINITIONS, getAdapter, callbackUrl } from "../../../../lib/dashboard/integrations/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireHqSession();
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const connections = await listConnections(supabase, session.workspaceId);
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  const integrations = INTEGRATION_DEFINITIONS.map((def) => {
    const adapter = getAdapter(def.id);
    const conn = byProvider.get(def.id);
    const missingEnv = def.requiredEnv.filter((k) => !process.env[k]);
    return {
      id: def.id,
      label: def.label,
      description: def.description,
      authMode: def.authMode,
      dataSourceKeys: def.dataSourceKeys,
      docsUrl: def.docsUrl,
      appConfigured: adapter.isConfigured() && missingEnv.length === 0,
      missingEnv,
      callbackUrl: def.authMode === "oauth" ? callbackUrl(def.id) : null,
      connection: conn
        ? {
            status: conn.status,
            accountLabel: conn.account_label,
            externalAccountId: conn.external_account_id,
            expiresAt: conn.expires_at,
            lastSyncAt: conn.last_sync_at,
            lastSyncStatus: conn.last_sync_status,
            lastSyncError: conn.last_sync_error,
            metadata: conn.metadata,
          }
        : null,
    };
  });

  return NextResponse.json({ integrations });
}
