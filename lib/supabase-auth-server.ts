import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAuthClient: SupabaseClient | null = null;

export function getSupabaseAnonAuthClient() {
  if (cachedAuthClient) return cachedAuthClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  cachedAuthClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAuthClient;
}

/** Resolve Supabase Auth user id from Bearer access token (shared web + iOS). */
export async function getSupabaseAuthUserId(accessToken: string): Promise<string | null> {
  const client = getSupabaseAnonAuthClient();
  if (!client || !accessToken) return null;
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user?.id) return null;
  return data.user.id;
}
