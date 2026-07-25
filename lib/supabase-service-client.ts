import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ""
  );
}

function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function getAnonKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""
  );
}

/** Reuse one service client per serverless isolate — avoids reconnect tax on every HQ query. */
let cachedServiceClient: SupabaseClient | null = null;

/** Service-role (or anon) Supabase client for server-side catalog RPCs. */
export function getServerSupabase() {
  if (cachedServiceClient) return cachedServiceClient;

  const url = getSupabaseUrl();
  const key = getServiceRoleKey() || getAnonKey();
  if (!url || !key) {
    console.warn(
      "Missing Supabase environment variables — returning null client. Checked: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, VITE_SUPABASE_URL"
    );
    return null;
  }
  cachedServiceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedServiceClient;
}
