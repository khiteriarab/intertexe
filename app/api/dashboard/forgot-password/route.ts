import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";
import { writeAuthAudit } from "../../../../lib/dashboard/auth";
import { buildDashboardPasswordResetRedirect } from "../../../../lib/platform-urls";
import { getEnterpriseAnonClient, getEnterpriseServiceClient } from "../../../../lib/enterprise/client";
import { discoverSsoByEmail } from "../../../../lib/enterprise/sso-config";
import { isLinkedEnterprisePrincipal } from "../../../../lib/enterprise/identity-links";

export const dynamic = "force-dynamic";

function isTechnicalPrincipalEmail(email: string): boolean {
  return /^itx-principal\.[a-f0-9]+@identity\.intertexe\.com$/.test(email);
}

async function isEnterpriseBrandAccount(email: string): Promise<boolean> {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("auth_user_id")
    .eq("email", email)
    .maybeSingle();
  if (!profile?.auth_user_id) return false;
  if (await isLinkedEnterprisePrincipal(String(profile.auth_user_id))) return false;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const redirectTo = buildDashboardPasswordResetRedirect(request.nextUrl.origin);
    const discovery = await discoverSsoByEmail(email);
    const enterpriseOnly =
      !isTechnicalPrincipalEmail(email) && (await isEnterpriseBrandAccount(email));

    if (enterpriseOnly) {
      const enterpriseAuth = getEnterpriseAnonClient();
      if (enterpriseAuth) {
        if (discovery.ssoAvailable && discovery.enforceSso && !discovery.allowPasswordFallback) {
          return NextResponse.json({
            ok: true,
            message: "If that account exists, a reset link has been sent.",
          });
        }
        const { error } = await enterpriseAuth.auth.resetPasswordForEmail(email, { redirectTo });
        await writeAuthAudit({
          email,
          eventName: error ? "enterprise_password_reset_failed" : "enterprise_password_reset_requested",
          metadata: error ? { reason: error.message, project: "obelisk-core" } : { project: "obelisk-core" },
        });
      }
      return NextResponse.json({
        ok: true,
        message: "If that account exists, a reset link has been sent.",
      });
    }

    const auth = getSupabaseAnonAuthClient();
    if (!auth) {
      return NextResponse.json({ message: "Auth is not configured." }, { status: 503 });
    }

    // HQ Auth only for internal/staff accounts. Linked technical principals are skipped.
    if (!isTechnicalPrincipalEmail(email)) {
      const { error } = await auth.auth.resetPasswordForEmail(email, { redirectTo });
      await writeAuthAudit({
        email,
        eventName: error ? "password_reset_failed" : "password_reset_requested",
        metadata: error ? { reason: error.message, project: "intertexe-hq" } : { project: "intertexe-hq" },
      });
    }

    return NextResponse.json({
      ok: true,
      message: "If that account exists, a reset link has been sent.",
    });
  } catch {
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
