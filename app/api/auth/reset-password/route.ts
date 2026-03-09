import { NextRequest, NextResponse } from "next/server";
import { verifyResetToken, hashPassword, updateUserPassword, storeToken } from "../../../../lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return NextResponse.json({ message: "Token and new password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    const payload = verifyResetToken(token);
    if (!payload) {
      return NextResponse.json({ message: "This reset link has expired or is invalid. Please request a new one." }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    const updated = await updateUserPassword(payload.userId, hashed);
    if (!updated) {
      return NextResponse.json({ message: "Unable to update password. Please try again." }, { status: 500 });
    }

    const authToken = await storeToken(payload.userId);
    return NextResponse.json({ message: "Password updated successfully", token: authToken });
  } catch {
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
