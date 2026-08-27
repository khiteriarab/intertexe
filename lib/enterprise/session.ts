import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getEnterpriseAnonClient } from "./client";
import { ENTERPRISE_SESSION_COOKIE } from "./constants";

export type EnterpriseAuthSession = {
  authUserId: string;
  email: string;
  fullName: string | null;
  accessToken: string;
};

export async function readEnterpriseAccessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ENTERPRISE_SESSION_COOKIE)?.value?.trim() || null;
}

export const getEnterpriseAuthSession = cache(async (): Promise<EnterpriseAuthSession | null> => {
  const token = await readEnterpriseAccessToken();
  if (!token) return null;
  const url = (process.env.ENTERPRISE_SUPABASE_URL || "").trim();
  const anon = (
    process.env.ENTERPRISE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_ENTERPRISE_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  if (!url || !anon) {
    const fallback = getEnterpriseAnonClient();
    if (!fallback) return null;
    const { data, error } = await fallback.auth.getUser(token);
    if (error || !data.user?.id || !data.user.email) return null;
    return {
      authUserId: data.user.id,
      email: data.user.email.trim().toLowerCase(),
      fullName: (data.user.user_metadata?.name as string) || null,
      accessToken: token,
    };
  }
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email) return null;
  return {
    authUserId: data.user.id,
    email: data.user.email.trim().toLowerCase(),
    fullName: (data.user.user_metadata?.name as string) || null,
    accessToken: token,
  };
});
