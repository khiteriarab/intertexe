import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HQ_SESSION_COOKIE, isHqHost, isPlatformHost } from "./lib/dashboard/constants";
import {
  ENTERPRISE_SESSION_COOKIE,
  dashboardPathRequiresEnterpriseSession,
} from "./lib/enterprise/constants";
import { demoRequestHasForbiddenOrgSelector } from "./lib/enterprise/demo-guard";

const API_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
  "CDN-Cache-Control": "public, s-maxage=30",
  "Vercel-CDN-Cache-Control": "public, s-maxage=30",
};

/** Private/auth APIs must never get public CDN cache (cached 401s → iOS "cancelled"). */
const PRIVATE_API_NO_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
};

/**
 * Opt-in public CDN cache for anonymous catalog reads only.
 * Default for every other /api/* is private no-store — Inspirations
 * (`/api/capture`), favorites, auth, cron, dashboard, etc.
 */
const PUBLIC_API_CACHE_PREFIXES = [
  "/api/products",
  "/api/catalog",
  "/api/sale",
  "/api/health",
  "/api/homepage",
  "/api/designers",
  "/api/feeds",
  "/api/collections",
];

function hasDashboardSession(request: NextRequest): boolean {
  return !!(
    request.cookies.get(HQ_SESSION_COOKIE)?.value?.trim() ||
    request.cookies.get(ENTERPRISE_SESSION_COOKIE)?.value?.trim()
  );
}

function enterpriseLoginPath(host: string | null): string {
  return isPlatformHost(host) ? "/" : "/dashboard/login";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");

  if (
    pathname === "/platform/demo" ||
    pathname.startsWith("/platform/demo/") ||
    pathname.startsWith("/api/v1/demo")
  ) {
    if (demoRequestHasForbiddenOrgSelector(request.nextUrl.searchParams)) {
      return new NextResponse("Demonstration does not accept organization selectors.", {
        status: 400,
      });
    }
  }

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

  // platform.intertexe.com → enterprise login at /, existing /dashboard SaaS only
  if (isPlatformHost(host)) {
    const consumerOrigin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.intertexe.com";

    if (pathname.startsWith("/platform")) {
      return NextResponse.redirect(`${consumerOrigin}${pathname}${request.nextUrl.search}`);
    }

    const isEnterpriseSurface =
      pathname === "/" ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/api/dashboard") ||
      pathname.startsWith("/api/auth/sso") ||
      pathname.startsWith("/auth/sso") ||
      pathname.startsWith("/reset-password");

    // Consumer routes (account, shop, etc.) belong on www — never rewrite into /dashboard/*
    if (
      !isEnterpriseSurface &&
      !pathname.startsWith("/_next") &&
      pathname !== "/favicon.ico"
    ) {
      return NextResponse.redirect(`${consumerOrigin}${pathname}${request.nextUrl.search}`);
    }

    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      if (hasDashboardSession(request)) {
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
      url.pathname = "/dashboard/login";
      return NextResponse.rewrite(url);
    }
  }

  // dashboard.intertexe.com (or legacy hq.) → /dashboard app
  if (isHqHost(host)) {
    const isAuthSurface =
      pathname.startsWith("/api/auth/sso") ||
      pathname.startsWith("/auth/sso") ||
      pathname.startsWith("/reset-password");

    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.rewrite(url);
    }
    if (
      !isAuthSurface &&
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
    const token =
      request.cookies.get(HQ_SESSION_COOKIE)?.value ||
      request.cookies.get(ENTERPRISE_SESSION_COOKIE)?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = enterpriseLoginPath(host);
      if (url.pathname !== "/") {
        url.searchParams.set("next", pathname);
      } else if (pathname !== "/dashboard/login") {
        url.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(url);
    }
    if (dashboardPathRequiresEnterpriseSession(pathname)) {
      const enterprise = request.cookies.get(ENTERPRISE_SESSION_COOKIE)?.value?.trim();
      if (!enterprise) {
        const hq = request.cookies.get(HQ_SESSION_COOKIE)?.value?.trim();
        if (!hq) {
          const url = request.nextUrl.clone();
          url.pathname = enterpriseLoginPath(host);
          if (url.pathname !== "/") {
            url.searchParams.set("next", pathname);
          }
          return NextResponse.redirect(url);
        }
        const url = request.nextUrl.clone();
        url.pathname = "/api/dashboard/workspace/handoff";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const allowPublicCache = PUBLIC_API_CACHE_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const headers = allowPublicCache ? API_CACHE_HEADERS : PRIVATE_API_NO_CACHE_HEADERS;
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|google86cefdb626fe12b8\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
