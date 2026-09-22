import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/** Browser client for consumer/HQ Auth (intertexe). Not for obelisk SaaS. */
export function createConsumerBrowserClient() {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Allow `next build` to prerender when env is only set on Vercel, not locally
    if (typeof window === "undefined") {
      browserClient = createSupabaseClient("https://placeholder.supabase.co", "placeholder-anon-key", {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return browserClient;
    }
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  browserClient = createSupabaseClient(url, key);
  return browserClient;
}

/** @deprecated Prefer createConsumerBrowserClient */
export function createClientComponentClient() {
  return createConsumerBrowserClient();
}
