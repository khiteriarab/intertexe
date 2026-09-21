import type { SupabaseClient } from "@supabase/supabase-js";
import { getObeliskServiceClient } from "./client";

/**
 * Obelisk-core service client (throws if unset).
 * Prefer getObeliskServiceClient() when a null client is acceptable.
 * Uses the same URL≠consumer guard as lib/enterprise/client.ts.
 */
export function createEnterpriseServiceClient(): SupabaseClient {
  const client = getObeliskServiceClient();
  if (!client) {
    throw new Error("Enterprise Supabase is not configured");
  }
  return client;
}

/** @deprecated Prefer getObeliskServiceClient or createEnterpriseServiceClient */
export function createObeliskServiceClient(): SupabaseClient {
  return createEnterpriseServiceClient();
}
