import { getSupabaseAuthUserId } from "../supabase-auth-server";

export async function requireResaleUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  return getSupabaseAuthUserId(token);
}
