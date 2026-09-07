import { NextRequest, NextResponse } from "next/server";
import { HQ_SESSION_COOKIE } from "../../../../../lib/dashboard/auth";
import {
  clearHostScopedSessionCookieOptions,
  hostScopedSessionCookieOptions,
} from "../../../../../lib/dashboard/session-cookies";
import { ENTERPRISE_SESSION_COOKIE } from "../../../../../lib/enterprise/constants";
import {
  authorizeEnterpriseSsoSessionFromToken,
  resolveSsoPostLoginRedirect,
} from "../../../../../lib/enterprise/sso";
import { ENTERPRISE_SSO_STATE_COOKIE, verifySsoStateToken } from "../../../../../lib/enterprise/sso-state";

export const dynamic = "force-dynamic";

/** POST — complete SSO from client-side hash tokens (SAML implicit flow). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = String(body.accessToken || "");
    const stateCookie = request.cookies.get(ENTERPRISE_SSO_STATE_COOKIE)?.value;
    if (!accessToken || !stateCookie) {
      return NextResponse.json({ message: "Invalid SSO session." }, { status: 400 });
    }
    const state = verifySsoStateToken(stateCookie);
    if (!state) {
      return NextResponse.json({ message: "SSO state expired." }, { status: 400 });
    }
    const authorized = await authorizeEnterpriseSsoSessionFromToken({
      accessToken,
      organizationId: state.organizationId,
    });
    if (!authorized.ok) {
      return NextResponse.json({ message: authorized.reason }, { status: 403 });
    }
    const next = typeof body.next === "string" ? body.next : null;
    const redirectTo = resolveSsoPostLoginRedirect({
      organizationSlug: authorized.organizationSlug,
      next,
    });
    const response = NextResponse.json({ ok: true, redirectTo });
    response.cookies.set(ENTERPRISE_SESSION_COOKIE, accessToken, hostScopedSessionCookieOptions());
    response.cookies.set(HQ_SESSION_COOKIE, "", clearHostScopedSessionCookieOptions());
    response.cookies.set(ENTERPRISE_SSO_STATE_COOKIE, "", clearHostScopedSessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ message: "SSO completion failed." }, { status: 500 });
  }
}
