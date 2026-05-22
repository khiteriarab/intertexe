import { createClient } from "@supabase/supabase-js";

export function getSupabaseAnonAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Resolve Supabase Auth user id from Bearer access token (shared web + iOS). */
export async function getSupabaseAuthUserId(accessToken: string): Promise<string | null> {
  const client = getSupabaseAnonAuthClient();
  if (!client || !accessToken) return null;
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user?.id) return null;
  return data.user.id;
}
