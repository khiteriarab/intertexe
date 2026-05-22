export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, getUserByUsername } from "../../../../lib/auth-helpers";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";
import { sendWelcomeEmail } from "../../../../server/resend";
import { snakeToCamel } from "../../../../lib/case-utils";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, username: providedUsername } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const username = providedUsername || email;
    const cleanEmail = String(email).trim();

    const existingEmail = await getUserByEmail(cleanEmail);
    if (existingEmail) {
      return NextResponse.json({ message: "Email already registered" }, { status: 400 });
    }

    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json({ message: "An account with this email already exists" }, { status: 400 });
    }

    const auth = getSupabaseAnonAuthClient();
    if (!auth) {
      return NextResponse.json({ message: "Unable to create account. Please try again later." }, { status: 500 });
    }

    const { data, error } = await auth.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name: name || null } },
    });

    if (error) {
      const msg = error.message?.toLowerCase().includes("already")
        ? "An account with this email already exists"
        : error.message || "Unable to create account";
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    sendWelcomeEmail(cleanEmail, name).catch(() => {});

    const session = data.session;
    const user = data.user;
    if (!session?.access_token || !user?.id) {
      return NextResponse.json(
        {
          message: "Account created. Check your email to confirm, then sign in.",
          needsEmailConfirmation: true,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        ...snakeToCamel({
          id: user.id,
          email: user.email ?? cleanEmail,
          name: name || null,
          username: cleanEmail,
        }),
        token: session.access_token,
      },
      { status: 201 }
    );
  } catch (err: any) {
    const msg = err?.message || "Something went wrong. Please try again.";
    const isUserError = msg.includes("already exists") || msg.includes("already registered");
    return NextResponse.json({ message: msg }, { status: isUserError ? 400 : 500 });
  }
}
