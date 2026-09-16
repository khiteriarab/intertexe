import type { SupabaseClient } from "@supabase/supabase-js";

export type ApiAuthResult =
  | { ok: true; organizationId: string; slug: string }
  | { ok: false; status: number; message: string };

/** Resolve organization from Bearer API token (prefix match against stored credentials). */
export async function authenticateApiRequest(
  client: SupabaseClient,
  authorizationHeader: string | null
): Promise<ApiAuthResult> {
  const token = (authorizationHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { ok: false, status: 401, message: "Bearer token required" };
  }

  const prefix = token.slice(0, 12);
  const { data: credential } = await client
    .from("api_credentials")
    .select("organization_id, prefix, organizations(slug)")
    .eq("prefix", prefix)
    .maybeSingle();

  if (!credential?.organization_id) {
    return { ok: false, status: 401, message: "Invalid API credential" };
  }

  const org = Array.isArray(credential.organizations) ? credential.organizations[0] : credential.organizations;
  if (!org?.slug) {
    return { ok: false, status: 401, message: "Organization not found for credential" };
  }

  return { ok: true, organizationId: credential.organization_id, slug: org.slug };
}
