import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** SCIM placeholder — stores bearer token hash only. Full SCIM endpoints deferred. */
export async function enableScimConnection(
  client: SupabaseClient,
  organizationId: string
): Promise<{ token: string; endpoint: string }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await client.from("scim_connections").upsert({
    organization_id: organizationId,
    enabled: true,
    bearer_token_hash: tokenHash,
    metadata: { version: "placeholder-v1" },
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  await client.from("organization_security_settings").upsert({
    organization_id: organizationId,
    scim_enabled: true,
    updated_at: new Date().toISOString(),
  });

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://platform.intertexe.com").replace(/\/$/, "");
  return {
    token,
    endpoint: `${origin}/api/scim/v2/organizations/${organizationId}`,
  };
}

export async function getScimStatus(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("scim_connections")
    .select("enabled, last_sync_at, created_at, updated_at")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data;
}

export async function disableScimConnection(client: SupabaseClient, organizationId: string) {
  await client
    .from("scim_connections")
    .update({ enabled: false, bearer_token_hash: null, updated_at: new Date().toISOString() })
    .eq("organization_id", organizationId);
  await client
    .from("organization_security_settings")
    .update({ scim_enabled: false, updated_at: new Date().toISOString() })
    .eq("organization_id", organizationId);
}
