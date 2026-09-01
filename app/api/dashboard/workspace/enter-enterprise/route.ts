import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../../lib/dashboard/auth";
import { ENTERPRISE_SESSION_COOKIE } from "../../../../../lib/enterprise/constants";
import { mintStaffEnterpriseHandoff } from "../../../../../lib/enterprise/handoff";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const hq = await getHqSession();
  if (!hq) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  let slug = "";
  let redirectTo = "";
  try {
    const body = await request.json();
    slug = String(body.slug || "").trim().toLowerCase();
    redirectTo = String(body.redirectTo || "").trim();
  } catch {
    slug = "";
  }
  try {
    const minted = await mintStaffEnterpriseHandoff({
      hqUserId: hq.authUserId,
      hqEmail: hq.email,
      slug: slug || undefined,
    });
    const maxAge = Math.max(1, Math.floor((minted.expiresAt.getTime() - Date.now()) / 1000));
    const safeRedirect =
      redirectTo.startsWith(`/dashboard/${minted.membership.slug}`) ? redirectTo : `/dashboard/${minted.membership.slug}`;
    const response = NextResponse.json({
      ok: true,
      redirectTo: safeRedirect,
      expiresAt: minted.expiresAt.toISOString(),
    });
    response.cookies.set(ENTERPRISE_SESSION_COOKIE, minted.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Workspace switch failed." },
      { status: 403 }
    );
  }
}
