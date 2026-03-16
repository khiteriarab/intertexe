import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, hashPassword, createUser, storeToken } from "../../../../lib/auth-helpers";
import { snakeToCamel } from "../../../../lib/case-utils";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }

    const existingUser = await getUserByEmail(normalizedEmail);

    if (existingUser) {
      const token = await storeToken(existingUser.id);
      const { password: _, ...safeUser } = existingUser;
      const needsPassword = !existingUser.password || existingUser.password.startsWith("email_capture_");
      return NextResponse.json({
        ...snakeToCamel(safeUser),
        token,
        isNewUser: false,
        needsPassword,
      });
    }

    const placeholderPassword = `email_capture_${Date.now()}`;
    const hashedPlaceholder = await hashPassword(placeholderPassword);
    const username = normalizedEmail;

    const user = await createUser({
      username,
      email: normalizedEmail,
      password: hashedPlaceholder,
      name: null,
    });

    const token = await storeToken(user.id);
    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      ...snakeToCamel(safeUser),
      token,
      isNewUser: true,
      needsPassword: true,
    }, { status: 201 });
  } catch (err: any) {
    const msg = err?.message || "Something went wrong";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
