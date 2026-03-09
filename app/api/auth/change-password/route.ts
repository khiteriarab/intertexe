import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, comparePasswords, hashPassword, updateUserPassword } from "../../../../lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: "Current and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: "New password must be at least 6 characters" }, { status: 400 });
    }

    const valid = await comparePasswords(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);
    const updated = await updateUserPassword(user.id, hashed);
    if (!updated) {
      return NextResponse.json({ message: "Unable to update password. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ message: "Password updated successfully" });
  } catch {
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
