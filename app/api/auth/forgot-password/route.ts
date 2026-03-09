import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createResetToken } from "../../../../lib/auth-helpers";
import { sendPasswordResetEmail } from "../../../../server/resend";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (user) {
      const token = createResetToken(user.id);
      const resetUrl = `https://www.intertexe.com/reset-password?token=${token}`;
      sendPasswordResetEmail(email, user.name || "there", resetUrl).catch(() => {});
    }

    return NextResponse.json({ message: "If an account with that email exists, we've sent a reset link." });
  } catch {
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
