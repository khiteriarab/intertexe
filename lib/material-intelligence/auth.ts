import type { SupabaseClient } from "@supabase/supabase-js";
import { hashApiKey, looksLikeApiKey } from "./keys";

export type MaterialApiAuth =
  | {
      ok: true;
      clientId: string;
      keyId: string;
      plan: string;
      rateLimitPerMinute: number;
      monthlyLimit: number;
    }
  | { ok: false; status: 401 | 403; code: string; message: string };

export function bearerFromHeader(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

export async function authenticateMaterialKey(
  supabase: SupabaseClient,
  authorization: string | null
): Promise<MaterialApiAuth> {
  const raw = bearerFromHeader(authorization);
  if (!raw || !looksLikeApiKey(raw)) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      message: "A valid INTERTEXE API key is required in the Authorization Bearer header.",
    };
  }
  const keyHash = hashApiKey(raw);
  const { data: key, error } = await supabase
    .from("material_api_keys")
    .select("id, client_id, status, expires_at, material_api_clients(id, plan, rate_limit_per_minute, monthly_limit, is_active)")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !key) {
    return { ok: false, status: 401, code: "unauthorized", message: "Invalid API key." };
  }
  if (key.status === "revoked") {
    return { ok: false, status: 401, code: "revoked", message: "This API key has been revoked." };
  }
  if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) {
    return { ok: false, status: 403, code: "expired", message: "This API key has expired." };
  }
  const client = Array.isArray(key.material_api_clients)
    ? key.material_api_clients[0]
    : key.material_api_clients;
  if (!client || client.is_active === false) {
    return { ok: false, status: 403, code: "inactive", message: "This API client is inactive." };
  }
  return {
    ok: true,
    clientId: String(client.id || key.client_id),
    keyId: String(key.id),
    plan: String(client.plan || "founding_pilot"),
    rateLimitPerMinute: Number(client.rate_limit_per_minute || 60),
    monthlyLimit: Number(client.monthly_limit || 5000),
  };
}

export async function enforceRateLimit(
  supabase: SupabaseClient,
  auth: Extract<MaterialApiAuth, { ok: true }>
): Promise<{ ok: true; remaining: number } | { ok: false; retryAfter: number }> {
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("material_api_usage")
    .select("id", { count: "exact", head: true })
    .eq("key_id", auth.keyId)
    .gte("created_at", minuteAgo);
  const used = count || 0;
  if (used >= auth.rateLimitPerMinute) {
    return { ok: false, retryAfter: 60 };
  }
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count: monthCount } = await supabase
    .from("material_api_usage")
    .select("id", { count: "exact", head: true })
    .eq("client_id", auth.clientId)
    .gte("created_at", monthStart.toISOString());
  if ((monthCount || 0) >= auth.monthlyLimit) {
    return { ok: false, retryAfter: 3600 };
  }
  return { ok: true, remaining: Math.max(0, auth.rateLimitPerMinute - used - 1) };
}

export async function logMaterialUsage(
  supabase: SupabaseClient,
  row: {
    clientId: string;
    keyId: string;
    requestId: string;
    gtinLength: number | null;
    matchStatus?: string | null;
    matchType?: string | null;
    evidenceStatus?: string | null;
    statusCode: number;
    latencyMs: number;
  }
) {
  await supabase.from("material_api_usage").insert({
    client_id: row.clientId,
    key_id: row.keyId,
    request_id: row.requestId,
    gtin_length: row.gtinLength,
    match_status: row.matchStatus || null,
    match_type: row.matchType || null,
    evidence_status: row.evidenceStatus || null,
    status_code: row.statusCode,
    latency_ms: row.latencyMs,
  });
}
