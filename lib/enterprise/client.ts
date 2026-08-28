import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function consumerUrl(): string {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}

function enterpriseUrl(): string {
  const url = (process.env.ENTERPRISE_SUPABASE_URL || "").trim();
  const consumer = consumerUrl();
  if (url && consumer && url.replace(/\/$/, "") === consumer.replace(/\/$/, "")) {
    throw new Error("ENTERPRISE_SUPABASE_URL must not equal the consumer/HQ SUPABASE_URL.");
  }
  return url;
}

function enterpriseServiceKey(): string {
  return (process.env.ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

function enterpriseAnonKey(): string {
  return (
    process.env.ENTERPRISE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_ENTERPRISE_SUPABASE_ANON_KEY ||
    ""
  ).trim();
}

export function isEnterpriseConfigured(): boolean {
  return Boolean(enterpriseUrl() && (enterpriseServiceKey() || enterpriseAnonKey()));
}

let cachedService: SupabaseClient | null = null;
let cachedAnon: SupabaseClient | null = null;

/** Service-role client for obelisk-core only. Never falls back to consumer HQ keys. */
export function getEnterpriseServiceClient(): SupabaseClient | null {
  const url = enterpriseUrl();
  const key = enterpriseServiceKey();
  if (!url || !key) return null;
  if (cachedService) return cachedService;
  cachedService = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedService;
}

export function getEnterpriseAnonClient(): SupabaseClient | null {
  const url = enterpriseUrl();
  const key = enterpriseAnonKey();
  if (!url || !key) return null;
  if (cachedAnon) return cachedAnon;
  cachedAnon = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAnon;
}

/**
 * One-off anon client for server-side session mint. Never reuse the cached
 * verifier — verifyOtp would otherwise leave another user's session in memory.
 */
export function createEphemeralEnterpriseAnonClient(): SupabaseClient {
  const url = enterpriseUrl();
  const key = enterpriseAnonKey();
  if (!url || !key) {
    throw new Error("Enterprise Auth is not configured.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** User-scoped obelisk-core client. RLS applies. Never use this with the service-role key. */
export function getEnterpriseUserClient(accessToken: string): SupabaseClient {
  const url = enterpriseUrl();
  const key = enterpriseAnonKey();
  if (!url || !key) {
    throw new Error("Enterprise user client requires ENTERPRISE_SUPABASE_URL and ENTERPRISE_SUPABASE_ANON_KEY.");
  }
  const token = accessToken.trim();
  if (!token) throw new Error("Enterprise user JWT is required.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
