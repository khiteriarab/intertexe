import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../../../lib/supabase-service-client";
import { verifyOAuthState } from "../../../../../../lib/dashboard/integrations/crypto";
import { upsertConnection, syncProvider } from "../../../../../../lib/dashboard/integrations/connections";
import {
  callbackUrl,
  getAdapter,
  isValidProvider,
  oauthRedirectBase,
} from "../../../../../../lib/dashboard/integrations/registry";

export const dynamic = "force-dynamic";

function settingsRedirect(query: Record<string, string>) {
  const u = new URL(`${oauthRedirectBase()}/dashboard/settings`);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return NextResponse.redirect(u.toString());
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider: raw } = await context.params;
  if (!isValidProvider(raw)) {
    return settingsRedirect({ integration_error: "unknown_provider" });
  }

  const url = request.nextUrl;
  const err = url.searchParams.get("error");
  if (err) {
    return settingsRedirect({
      integration_error: err,
      integration_provider: raw,
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || request.cookies.get("hq_oauth_state")?.value;
  if (!code || !state) {
    return settingsRedirect({ integration_error: "missing_code", integration_provider: raw });
  }

  const parsed = verifyOAuthState(state);
  if (!parsed || parsed.provider !== raw) {
    return settingsRedirect({ integration_error: "invalid_state", integration_provider: raw });
  }

  const session = await getHqSession();
  if (!session) {
    return settingsRedirect({ integration_error: "session_expired", integration_provider: raw });
  }
  if (parsed.workspaceId && parsed.workspaceId !== session.workspaceId) {
    return settingsRedirect({ integration_error: "workspace_mismatch", integration_provider: raw });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return settingsRedirect({ integration_error: "db_unavailable", integration_provider: raw });
  }

  try {
    const adapter = getAdapter(raw);
    const redirectUri = callbackUrl(raw);
    let bundle = await adapter.exchangeCode({ code, redirectUri });
    if (adapter.enrichAccount) {
      const extra = await adapter.enrichAccount(bundle.accessToken);
      bundle = {
        ...bundle,
        accountLabel: extra.accountLabel || bundle.accountLabel,
        externalAccountId: extra.externalAccountId || bundle.externalAccountId,
        metadata: { ...(bundle.metadata || {}), ...(extra.metadata || {}) },
      };
    }
    await upsertConnection(supabase, {
      workspaceId: session.workspaceId,
      provider: raw,
      bundle,
      connectedByInternalUserId: session.internalUserId,
    });
    // Fire-and-forget first sync (errors recorded on connection).
    void syncProvider(supabase, session.workspaceId, raw);

    const res = settingsRedirect({
      integration_connected: raw,
    });
    res.cookies.set("hq_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return settingsRedirect({
      integration_error: message.slice(0, 180),
      integration_provider: raw,
    });
  }
}
