import { NextRequest, NextResponse } from "next/server";
import { requireHqSession } from "../../../../../../lib/dashboard/auth";
import { signOAuthState } from "../../../../../../lib/dashboard/integrations/crypto";
import {
  callbackUrl,
  getAdapter,
  getDefinition,
  isValidProvider,
} from "../../../../../../lib/dashboard/integrations/registry";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const session = await requireHqSession();
  const { provider: raw } = await context.params;
  if (!isValidProvider(raw)) {
    return NextResponse.json({ message: "Unknown provider" }, { status: 404 });
  }
  const def = getDefinition(raw);
  if (!def || def.authMode !== "oauth") {
    return NextResponse.json(
      { message: "This integration does not use OAuth. Configure an API key instead." },
      { status: 400 }
    );
  }

  const adapter = getAdapter(raw);
  const missingEnv = def.requiredEnv.filter(
    (spec) =>
      !spec
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .some((key) => Boolean(process.env[key]?.trim()))
  );
  if (!adapter.isConfigured() || missingEnv.length) {
    const labels = (missingEnv.length ? missingEnv : def.requiredEnv).map((spec) =>
      spec
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" or ")
    );
    return NextResponse.json(
      {
        message: `App credentials missing. Set ${labels.join(", ")} in Vercel, then retry Connect.`,
      },
      { status: 503 }
    );
  }

  const state = signOAuthState({
    ts: Date.now(),
    workspaceId: session.workspaceId,
    provider: raw,
    uid: session.internalUserId,
  });
  const redirectUri = callbackUrl(raw);
  const url = adapter.getAuthorizationUrl({ state, redirectUri });

  const res = NextResponse.redirect(url);
  res.cookies.set("hq_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
  return res;
}
