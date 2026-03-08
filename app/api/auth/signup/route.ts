import { NextRequest, NextResponse } from "next/server";
import { hashPassword, storeToken, getUserByEmail, getUserByUsername, createUser } from "../../../../lib/auth-helpers";
import { sendWelcomeEmail } from "../../../../server/resend";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, username: providedUsername } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const username = providedUsername || email;

    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json({ message: "Email already registered" }, { status: 400 });
    }

    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json({ message: "An account with this email already exists" }, { status: 400 });
    }

    const user = await createUser({
      username,
      email,
      password: await hashPassword(password),
      name: name || null,
    });

    sendWelcomeEmail(email, name).catch(() => {});

    const token = await storeToken(user.id);
    const { password: _, ...safeUser } = user;
    return NextResponse.json({ ...safeUser, token }, { status: 201 });
  } catch (err: any) {
    const msg = err?.message || "Something went wrong. Please try again.";
    const isUserError = msg.includes("already exists") || msg.includes("already registered");
    return NextResponse.json({ message: msg }, { status: isUserError ? 400 : 500 });
  }
}
