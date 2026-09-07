import { NextRequest, NextResponse } from "next/server";
import { HQ_SESSION_COOKIE } from "../../../../../lib/dashboard/auth";
import {
  clearHostScopedSessionCookieOptions,
  hostScopedSessionCookieOptions,
} from "../../../../../lib/dashboard/session-cookies";
import { ENTERPRISE_SESSION_COOKIE } from "../../../../../lib/enterprise/constants";
import {
  authorizeEnterpriseSsoSession,
  exchangeEnterpriseSsoCode,
  resolveSsoPostLoginRedirect,
} from "../../../../../lib/enterprise/sso";
import { ENTERPRISE_SSO_STATE_COOKIE, verifySsoStateToken } from "../../../../../lib/enterprise/sso-state";

export const dynamic = "force-dynamic";

function loginErrorRedirect(request: NextRequest, code: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard/login";
  url.search = "";
  url.searchParams.set("sso_error", code);
  const response = NextResponse.redirect(url);
  response.cookies.set(ENTERPRISE_SSO_STATE_COOKIE, "", clearHostScopedSessionCookieOptions());
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateCookie = request.cookies.get(ENTERPRISE_SSO_STATE_COOKIE)?.value;
  if (!code || !stateCookie) {
    return loginErrorRedirect(request, "invalid_callback");
  }

  const state = verifySsoStateToken(stateCookie);
  if (!state) {
    return loginErrorRedirect(request, "expired_state");
  }

  const exchanged = await exchangeEnterpriseSsoCode({ code });
  if ("error" in exchanged) {
    return loginErrorRedirect(request, "exchange_failed");
  }

  const authorized = await authorizeEnterpriseSsoSession({
    accessToken: exchanged.accessToken,
    user: exchanged.user,
    organizationId: state.organizationId,
  });
  if (!authorized.ok) {
    return loginErrorRedirect(request, "not_authorized");
  }

  const next = request.nextUrl.searchParams.get("next");
  const redirectTo = resolveSsoPostLoginRedirect({
    organizationSlug: authorized.organizationSlug,
    next,
  });

  const response = NextResponse.redirect(new URL(redirectTo, request.nextUrl.origin));
  response.cookies.set(
    ENTERPRISE_SESSION_COOKIE,
    exchanged.accessToken,
    hostScopedSessionCookieOptions()
  );
  response.cookies.set(HQ_SESSION_COOKIE, "", clearHostScopedSessionCookieOptions());
  response.cookies.set(ENTERPRISE_SSO_STATE_COOKIE, "", clearHostScopedSessionCookieOptions());
  return response;
}
