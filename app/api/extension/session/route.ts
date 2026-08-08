export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthUserId } from "../../../../lib/supabase-auth-server";
import { createServiceClient } from "../../../../lib/supabase/server";

const TTL_MS = 5 * 60 * 1000;

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("CDN-Cache-Control", "no-store");
  res.headers.set("Vercel-CDN-Cache-Control", "no-store");
  return res;
}

function statusKey(extSession: string) {
  return `extension_auth:${extSession}`;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

/**
 * POST /api/extension/session
 * Website auth page parks access (+ optional refresh) for a short-lived ext_session nonce.
 * Prefers extension_auth_codes table; falls back to system_status for zero-downtime rollout.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const extSession = String(body.ext_session || body.extSession || "").trim();
    const accessToken = String(body.access_token || body.accessToken || body.token || "").trim();
    const refreshToken = String(body.refresh_token || body.refreshToken || "").trim() || null;

    if (!extSession || extSession.length < 16 || extSession.length > 128) {
      return cors(NextResponse.json({ error: "Invalid ext_session" }, { status: 400 }));
    }
    if (!accessToken) {
      return cors(NextResponse.json({ error: "Missing token" }, { status: 400 }));
    }

    const userId = await getSupabaseAuthUserId(accessToken);
    if (!userId) {
      return cors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const supabase = createServiceClient();
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
    const payload = {
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      consumed_at: null as string | null,
    };

    const { error: tableErr } = await supabase.from("extension_auth_codes").upsert(
      {
        ext_session: extSession,
        ...payload,
        created_at: new Date().toISOString(),
      },
      { onConflict: "ext_session" }
    );

    if (tableErr) {
      const { error: statusErr } = await supabase.from("system_status").upsert(
        {
          key: statusKey(extSession),
          value_json: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      if (statusErr) {
        console.error("[extension/session] park failed", tableErr.message, statusErr.message);
        return cors(NextResponse.json({ error: "Could not park session" }, { status: 500 }));
      }
    }

    return cors(NextResponse.json({ ok: true, expiresAt }));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Session park failed";
    return cors(NextResponse.json({ error: message }, { status: 500 }));
  }
}

/**
 * GET /api/extension/session?ext_session=…
 * Extension polls until tokens are ready. One-time consume.
 */
export async function GET(req: NextRequest) {
  try {
    const extSession = String(req.nextUrl.searchParams.get("ext_session") || "").trim();
    if (!extSession) {
      return cors(NextResponse.json({ error: "Missing ext_session" }, { status: 400 }));
    }

    const supabase = createServiceClient();

    const { data: row } = await supabase
      .from("extension_auth_codes")
      .select("access_token, refresh_token, user_id, expires_at, consumed_at")
      .eq("ext_session", extSession)
      .maybeSingle();

    if (row) {
      if (row.consumed_at) {
        return cors(NextResponse.json({ pending: true }));
      }
      if (new Date(row.expires_at).getTime() < Date.now()) {
        await supabase.from("extension_auth_codes").delete().eq("ext_session", extSession);
        return cors(NextResponse.json({ pending: true, expired: true }));
      }
      // Atomic one-time consume: only the first reader wins.
      const { data: consumed, error: consumeErr } = await supabase
        .from("extension_auth_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("ext_session", extSession)
        .is("consumed_at", null)
        .select("access_token, refresh_token, user_id")
        .maybeSingle();
      if (consumeErr || !consumed?.access_token) {
        return cors(NextResponse.json({ pending: true }));
      }
      void supabase
        .from("extension_auth_codes")
        .delete()
        .lt("expires_at", new Date().toISOString());
      return cors(
        NextResponse.json({
          ok: true,
          accessToken: consumed.access_token,
          refreshToken: consumed.refresh_token || null,
          userId: consumed.user_id,
        })
      );
    }

    const { data: status } = await supabase
      .from("system_status")
      .select("value_json")
      .eq("key", statusKey(extSession))
      .maybeSingle();

    const parked = (status?.value_json || null) as {
      access_token?: string;
      refresh_token?: string | null;
      user_id?: string;
      expires_at?: string;
      consumed_at?: string | null;
    } | null;

    if (!parked?.access_token || parked.consumed_at) {
      return cors(NextResponse.json({ pending: true }));
    }
    if (parked.expires_at && new Date(parked.expires_at).getTime() < Date.now()) {
      await supabase.from("system_status").delete().eq("key", statusKey(extSession));
      return cors(NextResponse.json({ pending: true, expired: true }));
    }

    await supabase.from("system_status").delete().eq("key", statusKey(extSession));

    return cors(
      NextResponse.json({
        ok: true,
        accessToken: parked.access_token,
        refreshToken: parked.refresh_token || null,
        userId: parked.user_id || null,
      })
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Session fetch failed";
    return cors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
