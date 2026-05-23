import { createClient } from "@supabase/supabase-js";

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

/** Service-role (or anon) Supabase client for server-side catalog RPCs. */
export function getServerSupabase() {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey() || getAnonKey();
  if (!url || !key) {
    console.warn(
      "Missing Supabase environment variables — returning null client. Checked: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, VITE_SUPABASE_URL"
    );
    return null;
  }
  return createClient(url, key);
}
