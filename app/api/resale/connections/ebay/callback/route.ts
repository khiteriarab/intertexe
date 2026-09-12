import { NextResponse } from "next/server";
import { getEnterpriseServiceClient } from "../../../../../../lib/enterprise/client";

export const dynamic = "force-dynamic";

/**
 * eBay OAuth callback — exchanges code for tokens and stores vault key reference server-side.
 * Requires EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_OAUTH_REDIRECT_URI.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/resale/connections?error=oauth_missing", url.origin));
  }

  const userId = state.split(":")[0];
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const redirectUri = process.env.EBAY_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/resale/connections?error=ebay_not_configured", url.origin));
  }

  const sandbox = process.env.EBAY_SANDBOX !== "false";
  const tokenHost = sandbox ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenRes = await fetch(`${tokenHost}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/resale/connections?error=token_exchange", url.origin));
  }

  const tokens = (await tokenRes.json()) as { access_token?: string; refresh_token?: string };
  const supabase = getEnterpriseServiceClient();
  if (supabase && userId && tokens.access_token) {
    const vaultKey = `EBAY_TOKEN_${userId.replace(/-/g, "").slice(0, 16).toUpperCase()}`;
    process.env[vaultKey] = tokens.access_token;
    await supabase.from("marketplace_connections").upsert(
      {
        user_id: userId,
        provider: "ebay",
        status: "connected",
        external_account_label: "eBay seller",
        token_vault_key: vaultKey,
        connected_at: new Date().toISOString(),
        capabilities: { listing_publish: true, order_status: true },
      },
      { onConflict: "user_id,provider" }
    );
  }

  return NextResponse.redirect(new URL("/resale/connections?connected=ebay", url.origin));
}
