import { scrypt, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { promisify } from "util";
import { getServerSupabase } from "./supabase-server";
import { getSupabaseAuthUserId } from "./supabase-auth-server";

const scryptAsync = promisify(scrypt);

function getTokenSecret(): string {
  const secret = process.env.TOKEN_SECRET
    || process.env.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || null;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "intertexe-dev-only-secret-key";
  return "intertexe-build-placeholder";
}
const TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    if (!stored || !stored.includes(".")) return false;
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
  } catch {
    return false;
  }
}

function signToken(userId: string): string {
  const exp = Date.now() + TOKEN_TTL;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", getTokenSecret()).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ userId, exp, sig })).toString("base64url");
}

function verifyToken(token: string): { userId: string; exp: number } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString());
    const { userId, exp, sig } = decoded;
    if (!userId || !exp || !sig) return null;
    if (Date.now() > exp) return null;
    const expected = createHmac("sha256", getTokenSecret()).update(`${userId}.${exp}`).digest("hex");
    if (sig !== expected) return null;
    return { userId, exp };
  } catch {
    return null;
  }
}

function normalizeUserId(userId: string | number): string {
  return String(userId);
}

export async function storeToken(userId: string | number): Promise<string> {
  return signToken(normalizeUserId(userId));
}

/** Auth user for account APIs — id is always Supabase Auth UUID when using ecosystem sync. */
export async function getUserFromToken(authHeader: string | null): Promise<any | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const supabaseUid = await getSupabaseAuthUserId(token);
  if (supabaseUid) {
    const authClient = (await import("./supabase-auth-server")).getSupabaseAnonAuthClient();
    const { data: authData } = authClient ? await authClient.auth.getUser(token) : { data: { user: null } };
    const email = authData.user?.email;
    const metaName = authData.user?.user_metadata?.name as string | undefined;

    const supabase = getServerSupabase();
    if (supabase && email) {
      const { data: legacy } = await supabase.from("users").select("*").eq("email", email).limit(1);
      if (legacy?.[0]) {
        return { ...legacy[0], id: supabaseUid, supabase_user_id: supabaseUid };
      }
    }
    return {
      id: supabaseUid,
      supabase_user_id: supabaseUid,
      email: email || null,
      name: metaName || null,
      username: email || supabaseUid,
    };
  }

  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const supabase = getServerSupabase();
    if (!supabase) return null;

    const id = normalizeUserId(payload.userId);
    let { data } = await supabase.from("users").select("*").eq("id", id).limit(1);
    if (!data?.[0] && /^\d+$/.test(id)) {
      ({ data } = await supabase.from("users").select("*").eq("id", Number(id)).limit(1));
    }

    return data?.[0] || null;
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const supabase = getServerSupabase();
    if (!supabase) return null;
    const { data } = await supabase.from("users").select("*").eq("email", email).limit(1);
    return data?.[0] || null;
  } catch {
    return null;
  }
}

export async function getUserByUsername(username: string) {
  try {
    const supabase = getServerSupabase();
    if (!supabase) return null;
    const { data } = await supabase.from("users").select("*").eq("username", username).limit(1);
    return data?.[0] || null;
  } catch {
    return null;
  }
}

export function createResetToken(userId: string): string {
  const exp = Date.now() + 60 * 60 * 1000;
  const payload = `reset.${userId}.${exp}`;
  const sig = createHmac("sha256", getTokenSecret()).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ userId, exp, sig, type: "reset" })).toString("base64url");
}

export function verifyResetToken(token: string): { userId: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString());
    const { userId, exp, sig, type } = decoded;
    if (!userId || !exp || !sig || type !== "reset") return null;
    if (Date.now() > exp) return null;
    const expected = createHmac("sha256", getTokenSecret()).update(`reset.${userId}.${exp}`).digest("hex");
    if (sig !== expected) return null;
    return { userId };
  } catch {
    return null;
  }
}

export async function updateUserPassword(userId: string, newHashedPassword: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("users").update({ password: newHashedPassword }).eq("id", userId);
  return !error;
}

export async function updateUserProfile(userId: string, updates: { name?: string; email?: string }): Promise<any | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const cleanUpdates: Record<string, string> = {};
  if (updates.name !== undefined) cleanUpdates.name = updates.name;
  if (updates.email !== undefined) {
    cleanUpdates.email = updates.email;
    cleanUpdates.username = updates.email;
  }
  const { data, error } = await supabase.from("users").update(cleanUpdates).eq("id", userId).select().single();
  if (error) {
    if (error.code === "23505") throw new Error("This email is already in use");
    throw new Error("Unable to update profile");
  }
  return data;
}

export async function deleteUserAccount(userId: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (!supabase) return false;
  await supabase.from("product_favorites").delete().eq("user_id", userId);
  await supabase.from("favorites").delete().eq("user_id", userId);
  await supabase.from("user_preferences").delete().eq("user_id", userId);
  await supabase.from("quiz_results").delete().eq("user_id", userId);
  await supabase.from("scan_history").delete().eq("user_id", userId);
  await supabase.from("price_watches").delete().eq("user_id", userId);
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) return false;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  if (serviceKey && url) {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    await admin.auth.admin.deleteUser(userId);
  }
  return true;
}

export async function createUser(userData: { username: string; email: string; password: string; name: string | null }) {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Unable to create account. Please try again later.");
  const { data: user, error } = await supabase.from("users").insert(userData).select().single();
  if (error) {
    if (error.message?.includes("duplicate") || error.code === "23505") {
      throw new Error("An account with this email already exists");
    }
    throw new Error("Unable to create account. Please try again later.");
  }
  return user;
}
