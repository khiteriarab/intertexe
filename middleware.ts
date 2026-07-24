import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HQ_SESSION_COOKIE, isHqHost } from "./lib/dashboard/constants";

const API_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
  "CDN-Cache-Control": "public, s-maxage=30",
  "Vercel-CDN-Cache-Control": "public, s-maxage=30",
};

const NO_CACHE_PREFIXES = ["/api/auth/", "/api/cron/", "/api/dashboard/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");

  // Legacy /hq → /dashboard
  if (pathname === "/hq" || pathname.startsWith("/hq/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/hq/, "/dashboard") || "/dashboard";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/api/hq/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/api\/hq/, "/api/dashboard");
    return NextResponse.redirect(url);
  }

  // dashboard.intertexe.com (or legacy hq.) → /dashboard app
  if (isHqHost(host)) {
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.rewrite(url);
    }
    if (
      !pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/api/dashboard") &&
      !pathname.startsWith("/_next")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/dashboard${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // Protect dashboard pages (except login)
  if (
    pathname.startsWith("/dashboard") &&
    pathname !== "/dashboard/login" &&
    !pathname.startsWith("/dashboard/login/")
  ) {
    const token = request.cookies.get(HQ_SESSION_COOKIE)?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  if (NO_CACHE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(API_CACHE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
