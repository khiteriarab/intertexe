import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function generateApiKey(): { prefix: string; secret: string; full: string } {
  const prefix = `itx_${randomBytes(4).toString("hex")}`;
  const secret = randomBytes(24).toString("base64url");
  return { prefix, secret, full: `${prefix}.${secret}` };
}

export async function createApiCredential(input: {
  client: SupabaseClient;
  organizationId: string;
  name: string;
  scopes?: string[];
  createdBy?: string | null;
  expiresAt?: string | null;
}): Promise<{ id: string; key: string; prefix: string }> {
  const { prefix, secret, full } = generateApiKey();
  const { data, error } = await input.client
    .from("api_credentials")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      prefix,
      secret_hash: hashSecret(secret),
      scopes: input.scopes || ["read"],
      created_by: input.createdBy || null,
      expires_at: input.expiresAt || null,
    })
    .select("id")
    .maybeSingle();
  if (error || !data?.id) throw new Error(error?.message || "Could not create API credential.");
  return { id: data.id, key: full, prefix };
}

export async function revokeApiCredential(
  client: SupabaseClient,
  organizationId: string,
  credentialId: string
) {
  const { error } = await client
    .from("api_credentials")
    .update({ revoked_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", credentialId);
  if (error) throw new Error(error.message);
}

export async function listApiCredentials(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("api_credentials")
    .select("id, name, prefix, scopes, last_used_at, expires_at, revoked_at, created_at")
    .eq("organization_id", organizationId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return data || [];
}
