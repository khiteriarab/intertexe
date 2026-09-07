import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../../lib/dashboard/auth";
import { isPlatformHost } from "../../../../../lib/dashboard/constants";
import { hostScopedSessionCookieOptions } from "../../../../../lib/dashboard/session-cookies";
import { ENTERPRISE_SESSION_COOKIE } from "../../../../../lib/enterprise/constants";
import { mintStaffEnterpriseHandoff } from "../../../../../lib/enterprise/handoff";

export const dynamic = "force-dynamic";

function safeOrgPath(pathname: string, slug: string): string {
  const next = pathname.trim();
  if (next.startsWith(`/dashboard/${slug}`)) return next;
  return `/dashboard/${slug}`;
}

export async function GET(request: NextRequest) {
  const hq = await getHqSession();
  const host = request.headers.get("host");
  const loginPath = isPlatformHost(host) ? "/" : "/dashboard/login";
  const loginUrl = new URL(loginPath, request.url);
  if (!hq) {
    return NextResponse.redirect(loginUrl);
  }

  const next = request.nextUrl.searchParams.get("next") || "/dashboard";
  const slugParam = request.nextUrl.searchParams.get("slug") || "";
  const slugFromPath = next.match(/^\/dashboard\/([^/]+)/)?.[1] || "";
  const slug = (slugParam || slugFromPath).trim().toLowerCase();

  try {
    const minted = await mintStaffEnterpriseHandoff({
      hqUserId: hq.authUserId,
      hqEmail: hq.email,
      slug: slug || undefined,
    });
    const maxAge = Math.max(1, Math.floor((minted.expiresAt.getTime() - Date.now()) / 1000));
    const destination = safeOrgPath(next, minted.membership.slug);
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.set(ENTERPRISE_SESSION_COOKIE, minted.accessToken, hostScopedSessionCookieOptions(maxAge));
    return response;
  } catch {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}
