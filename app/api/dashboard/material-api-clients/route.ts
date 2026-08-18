import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../lib/dashboard/auth";
import { generateApiKey } from "../../../../lib/material-intelligence/keys";
import { getServerSupabase } from "../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.roles.some((r) => ["founder", "admin", "partnerships"].includes(r))) return forbidden();
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const { data: clients, error } = await supabase
    .from("material_api_clients")
    .select("id, name, company, email, plan, rate_limit_per_minute, monthly_limit, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ message: "Material API tables are not available yet." }, { status: 500 });

  const ids = (clients || []).map((c) => c.id);
  const { data: keys } = ids.length
    ? await supabase
        .from("material_api_keys")
        .select("id, client_id, key_prefix, last_four, status, environment, last_used_at, revoked_at, created_at")
        .in("client_id", ids)
    : { data: [] };

  const { data: leads } = await supabase
    .from("material_snapshot_leads")
    .select("id, first_name, last_name, email, company, intent, source_cta, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const usageQuery = await supabase
    .from("material_api_usage")
    .select("status_code, match_status")
    .gte("created_at", dayAgo)
    .limit(2000);
  const usage = usageQuery.error ? [] : usageQuery.data || [];
  const requests = usage.length;
  const matches = usage.filter((row) => row.match_status === "matched").length;
  const notFound = usage.filter((row) => row.match_status === "not_found").length;
  const errors = usage.filter((row) => Number(row.status_code) >= 400).length;

  return NextResponse.json({
    clients: clients || [],
    keys: keys || [],
    leads: leads || [],
    usage: {
      window: "24h",
      requests,
      matches,
      notFound,
      errors,
      notFoundRate: requests ? notFound / requests : 0,
      errorRate: requests ? errors / requests : 0,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.roles.some((r) => ["founder", "admin"].includes(r))) return forbidden();
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = await request.json();
  if (body.action === "revoke") {
    const keyId = String(body.keyId || "");
    if (!keyId) return NextResponse.json({ message: "keyId required" }, { status: 400 });
    const { error } = await supabase
      .from("material_api_keys")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", keyId);
    if (error) return NextResponse.json({ message: "Could not revoke key." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!name || !email) return NextResponse.json({ message: "name and email required" }, { status: 400 });

  const { data: client, error: clientError } = await supabase
    .from("material_api_clients")
    .insert({
      name,
      company: body.company || null,
      email,
      plan: body.plan || "founding_pilot",
      rate_limit_per_minute: body.rateLimitPerMinute != null ? Number(body.rateLimitPerMinute) : 60,
      monthly_limit: body.monthlyLimit != null ? Number(body.monthlyLimit) : 5000,
      is_active: true,
    })
    .select("id, name, email, plan")
    .maybeSingle();
  if (clientError || !client) {
    return NextResponse.json({ message: "Could not create client." }, { status: 500 });
  }

  const generated = generateApiKey(body.environment === "test" ? "test" : "live");
  const { data: key, error: keyError } = await supabase
    .from("material_api_keys")
    .insert({
      client_id: client.id,
      key_hash: generated.hash,
      key_prefix: generated.prefix,
      last_four: generated.lastFour,
      status: "active",
      environment: body.environment === "test" ? "test" : "live",
    })
    .select("id, key_prefix, last_four, status, environment")
    .maybeSingle();
  if (keyError) return NextResponse.json({ message: "Could not create API key." }, { status: 500 });

  return NextResponse.json({
    client,
    key,
    rawKey: generated.raw,
    notice: "This raw key is shown once. INTERTEXE does not store it.",
  });
}
