import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createEnterpriseServiceClient(): SupabaseClient {
  const url = process.env.ENTERPRISE_SUPABASE_URL;
  const key = process.env.ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Enterprise Supabase is not configured");
  }
  return createClient(url, key);
}
