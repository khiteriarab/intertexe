export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  getUserFromToken,
  comparePasswords,
  deleteUserAccount,
} from "../../../../lib/auth-helpers";
import { getSupabaseAuthUserId } from "../../../../lib/supabase-auth-server";

async function handleDelete(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const user = await getUserFromToken(authHeader);

  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const userId = String(user.supabase_user_id || user.id);

  // Supabase Auth (iOS / Apple) — Bearer access token, no password
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const supabaseUid = await getSupabaseAuthUserId(token);
    if (supabaseUid) {
      const deleted = await deleteUserAccount(supabaseUid);
      if (!deleted) {
        return NextResponse.json(
          { message: "Unable to delete account. Please try again." },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, message: "Account deleted successfully" });
    }
  }

  // Legacy web accounts — password required
  let password: string | undefined;
  try {
    const body = await request.json();
    password = body?.password;
  } catch {
    password = undefined;
  }

  if (!password) {
    return NextResponse.json(
      { message: "Password is required to delete your account" },
      { status: 400 }
    );
  }

  if (!user.password) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const valid = await comparePasswords(password, user.password);
  if (!valid) {
    return NextResponse.json({ message: "Incorrect password" }, { status: 400 });
  }

  const deleted = await deleteUserAccount(userId);
  if (!deleted) {
    return NextResponse.json(
      { message: "Unable to delete account. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "Account deleted successfully" });
}

export async function DELETE(request: NextRequest) {
  try {
    return await handleDelete(request);
  } catch {
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleDelete(request);
  } catch {
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
