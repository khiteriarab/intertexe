export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { comparePasswords, storeToken, getUserByUsername, getUserByEmail } from "../../../../lib/auth-helpers";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";
import { snakeToCamel } from "../../../../lib/case-utils";
import { generatePermanentReferralCode } from "../../../../lib/invitation-codes";
import { linkScannerSessionToUser } from "../../../../lib/link-scanner-session";

async function signInWithSupabase(email: string, password: string) {
  const auth = getSupabaseAnonAuthClient();
  if (!auth) return null;
  const { data, error } = await auth.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.session?.access_token) return null;
  return {
    token: data.session.access_token,
    refreshToken: data.session.refresh_token || null,
    user: {
      id: data.user.id,
      email: data.user.email ?? email,
      name: (data.user.user_metadata?.name as string) || null,
      username: data.user.email ?? email,
    },
  };
}

async function ensureSupabaseAccount(email: string, password: string) {
  const auth = getSupabaseAnonAuthClient();
  if (!auth) return null;
  await auth.auth.signUp({ email: email.trim(), password });
  return signInWithSupabase(email, password);
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const email = String(username).trim();

    const supabaseSession = await signInWithSupabase(email, password);
    if (supabaseSession) {
      const userId = supabaseSession.user.id;
      if (userId) {
        generatePermanentReferralCode(userId).catch(console.error);
        const sid = request.headers.get("x-session-id")?.trim();
        if (sid) {
          await linkScannerSessionToUser(sid, userId);
        }
      }
      return NextResponse.json({
        ...snakeToCamel(supabaseSession.user),
        token: supabaseSession.token,
        refreshToken: supabaseSession.refreshToken,
      });
    }

    let user = await getUserByUsername(email);
    if (!user) user = await getUserByEmail(email);
    if (!user || !(await comparePasswords(password, user.password))) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const migrated = await ensureSupabaseAccount(email, password);
    if (migrated) {
      const userId = migrated.user.id;
      if (userId) {
        generatePermanentReferralCode(userId).catch(console.error);
      }
      return NextResponse.json({
        ...snakeToCamel(migrated.user),
        token: migrated.token,
        refreshToken: migrated.refreshToken,
      });
    }

    const token = await storeToken(String(user.id));
    const { password: _, ...safeUser } = user;
    return NextResponse.json({ ...snakeToCamel(safeUser), token });
  } catch {
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
