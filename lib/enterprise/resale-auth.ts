import { getConsumerAuthUserId } from "../supabase-auth-server";

/**
 * Resale marketplace buyers authenticate on the **consumer** Supabase project
 * (intertexe), not obelisk organization operators.
 * Do not swap this to getObelisk* — that would mix SaaS tenants with shoppers.
 */
export async function requireResaleUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  return getConsumerAuthUserId(token);
}
