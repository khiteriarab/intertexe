import { NextResponse } from "next/server";
import { getResaleSession } from "../../../../../lib/enterprise/resale-session-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  const session = await getResaleSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }
  if ("expired" in session && session.expired) {
    return NextResponse.json({ error: "session_expired", sessionId: session.sessionId }, { status: 410 });
  }

  return NextResponse.json(session);
}
