import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, updateUserProfile } from "../../../../lib/auth-helpers";
import { snakeToCamel } from "../../../../lib/case-utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    const { name, email } = await request.json();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "Please enter a valid email address" }, { status: 400 });
    }

    const updates: { name?: string; email?: string } = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No changes provided" }, { status: 400 });
    }

    const updated = await updateUserProfile(user.id, updates);
    if (!updated) {
      return NextResponse.json({ message: "Unable to update profile" }, { status: 500 });
    }

    const { password: _, ...safeUser } = updated;
    return NextResponse.json(snakeToCamel(safeUser));
  } catch (err: any) {
    const msg = err?.message || "Something went wrong";
    const status = msg.includes("already in use") ? 400 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}
