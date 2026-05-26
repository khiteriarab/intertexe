import { NextResponse } from "next/server";

export function authorizeCron(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function getWeekNumber(date = new Date()): number {
  return Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
}
