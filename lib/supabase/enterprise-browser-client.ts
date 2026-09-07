import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/** Browser client for obelisk-core Auth only — enterprise password reset and SSO callbacks on platform host. */
export function createEnterpriseClientComponentClient(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_ENTERPRISE_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_ENTERPRISE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    if (typeof window === "undefined") {
      browserClient = createClient("https://placeholder-enterprise.supabase.co", "placeholder-anon-key", {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return browserClient;
    }
    throw new Error("Missing NEXT_PUBLIC_ENTERPRISE_SUPABASE_URL or NEXT_PUBLIC_ENTERPRISE_SUPABASE_ANON_KEY");
  }
  browserClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return browserClient;
}
