import { NextRequest, NextResponse } from "next/server";
import { comparePasswords, storeToken, getUserByUsername, getUserByEmail } from "../../../../lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    let user = await getUserByUsername(username);
    if (!user) {
      user = await getUserByEmail(username);
    }
    if (!user || !(await comparePasswords(password, user.password))) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const token = await storeToken(user.id);
    const { password: _, ...safeUser } = user;
    return NextResponse.json({ ...safeUser, token });
  } catch {
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
