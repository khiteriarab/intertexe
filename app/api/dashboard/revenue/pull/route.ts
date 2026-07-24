import { NextResponse } from "next/server";
import { getHqSession } from "../../../../../lib/dashboard/auth";
import { pullRakutenRevenueReports } from "../../../../../lib/dashboard/rakuten-revenue-ftp";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.roles.some((r) => ["founder", "admin", "analyst"].includes(r))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await pullRakutenRevenueReports({
      workspaceId: session.workspaceId,
      maxFiles: 5,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Pull failed" }, { status: 500 });
  }
}
