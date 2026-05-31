import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
  "CDN-Cache-Control": "public, s-maxage=30",
  "Vercel-CDN-Cache-Control": "public, s-maxage=30",
};

const NO_CACHE_PREFIXES = ["/api/auth/", "/api/cron/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: "/api/:path*",
};
