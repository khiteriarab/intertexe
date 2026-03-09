import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, comparePasswords, deleteUserAccount } from "../../../../lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ message: "Password is required to delete your account" }, { status: 400 });
    }

    const valid = await comparePasswords(password, user.password);
    if (!valid) {
      return NextResponse.json({ message: "Incorrect password" }, { status: 400 });
    }

    const deleted = await deleteUserAccount(user.id);
    if (!deleted) {
      return NextResponse.json({ message: "Unable to delete account. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch {
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
