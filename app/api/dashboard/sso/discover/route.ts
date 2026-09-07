import { NextRequest, NextResponse } from "next/server";
import {
  discoverSsoByEmail,
  normalizeEmailDomain,
  toPublicSsoDiscovery,
} from "../../../../../lib/enterprise/sso-config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const email = String(request.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
  if (!email || email.length > 320 || !normalizeEmailDomain(email)) {
    return NextResponse.json({ ssoAvailable: false });
  }
  const discovery = await discoverSsoByEmail(email);
  return NextResponse.json(toPublicSsoDiscovery(discovery));
}
