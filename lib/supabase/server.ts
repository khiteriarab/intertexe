import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL
  );
}

/** Consumer/HQ service-role client (intertexe). Not for obelisk organizations. */
export function createConsumerServiceClient() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing consumer Supabase URL or service role key");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** @deprecated Prefer createConsumerServiceClient */
export function createServiceClient() {
  return createConsumerServiceClient();
}

/** Consumer/HQ anon client (intertexe). Not for obelisk organizations. */
export function createConsumerAnonClient() {
  const url = getSupabaseUrl();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing consumer Supabase URL or anon key");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** @deprecated Prefer createConsumerAnonClient */
export function createClient() {
  return createConsumerAnonClient();
}
