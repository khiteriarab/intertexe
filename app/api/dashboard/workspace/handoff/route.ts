import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../../lib/dashboard/auth";
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
  const loginUrl = new URL("/dashboard/login", request.url);
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
    response.cookies.set(ENTERPRISE_SESSION_COOKIE, minted.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}
