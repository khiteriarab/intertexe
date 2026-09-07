import { NextRequest, NextResponse } from "next/server";
import {
  clearHostScopedSessionCookieOptions,
  hostScopedSessionCookieOptions,
} from "../../../../../lib/dashboard/session-cookies";
import { discoverSsoByEmail } from "../../../../../lib/enterprise/sso-config";
import { startEnterpriseSsoRedirect } from "../../../../../lib/enterprise/sso";
import { createSsoStateToken, ENTERPRISE_SSO_STATE_COOKIE } from "../../../../../lib/enterprise/sso-state";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ message: "A valid work email is required." }, { status: 400 });
    }

    const discovery = await discoverSsoByEmail(email);
    if (!discovery.ssoAvailable || !discovery.organizationId) {
      return NextResponse.json({ message: "SSO is not configured for this email domain." }, { status: 404 });
    }

    const started = await startEnterpriseSsoRedirect({
      organizationId: discovery.organizationId,
      callbackOrigin: request.nextUrl.origin,
    });
    if ("error" in started) {
      return NextResponse.json({ message: started.error }, { status: started.status });
    }

    const state = createSsoStateToken(discovery.organizationId);
    const response = NextResponse.json({ redirectUrl: started.redirectUrl });
    response.cookies.set(ENTERPRISE_SSO_STATE_COOKIE, state.token, {
      ...hostScopedSessionCookieOptions(600),
      httpOnly: true,
    });
    return response;
  } catch {
    return NextResponse.json({ message: "Could not start SSO." }, { status: 500 });
  }
}

/** Clear stale SSO state without touching auth sessions. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ENTERPRISE_SSO_STATE_COOKIE, "", clearHostScopedSessionCookieOptions());
  return response;
}
