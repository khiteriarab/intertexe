import { NextResponse } from "next/server";

export const API_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
  "CDN-Cache-Control": "public, s-maxage=30",
  "Vercel-CDN-Cache-Control": "public, s-maxage=30",
} as const;

export function apiJson<T>(
  data: T,
  init?: ResponseInit & { status?: number }
): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...API_CACHE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}
