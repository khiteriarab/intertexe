import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "../../../../../lib/supabase-service-client";
import {
  getValidAccessToken,
  listConnections,
} from "../../../../../lib/dashboard/integrations/connections";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Founder/ops debug for Google property targeting.
 * Secure with Authorization: Bearer $CRON_SECRET
 * Returns property IDs + connected account email only (no tokens).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const ga4PropertyId = process.env.GA4_PROPERTY_ID?.trim() || null;
  const searchConsoleSiteUrl =
    process.env.SEARCH_CONSOLE_SITE_URL?.trim() || "https://www.intertexe.com/ (default)";

  const { data: workspace } = await supabase
    .from("hq_workspaces")
    .select("id, slug")
    .eq("slug", "intertexe")
    .maybeSingle();
  if (!workspace) return NextResponse.json({ message: "Workspace missing" }, { status: 404 });

  const connections = await listConnections(supabase, workspace.id);
  const google = connections.find((c) => c.provider === "google") || null;

  let tokenEmail: string | null = null;
  let tokenSub: string | null = null;
  let accessibleProperties: Array<{ propertyId: string; displayName: string }> = [];
  let accessibleSites: Array<{ siteUrl?: string; permissionLevel?: string }> = [];
  let discoveryError: string | null = null;

  if (google && (google.status === "connected" || google.status === "degraded" || google.status === "error")) {
    try {
      const { accessToken } = await getValidAccessToken(supabase, workspace.id, "google");
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
        redirect: "manual",
      });
      const userText = await userRes.text();
      if (userRes.ok) {
        const u = JSON.parse(userText) as { email?: string; id?: string };
        tokenEmail = u.email || null;
        tokenSub = u.id || null;
      } else {
        discoveryError = `userinfo HTTP ${userRes.status}: ${userText.slice(0, 160)}`;
      }

      const summaryRes = await fetch(
        "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          redirect: "manual",
        }
      );
      const summaryJson = JSON.parse(await summaryRes.text()) as {
        accountSummaries?: Array<{
          propertySummaries?: Array<{ property?: string; displayName?: string }>;
        }>;
        error?: { message?: string };
      };
      if (summaryRes.ok) {
        for (const account of summaryJson.accountSummaries || []) {
          for (const prop of account.propertySummaries || []) {
            const resource = String(prop.property || "");
            const id = resource.startsWith("properties/")
              ? resource.slice("properties/".length)
              : resource;
            if (!id) continue;
            accessibleProperties.push({
              propertyId: id,
              displayName: String(prop.displayName || id),
            });
          }
        }
      } else {
        discoveryError = [
          discoveryError,
          `accountSummaries HTTP ${summaryRes.status}: ${summaryJson.error?.message || "failed"}`,
        ]
          .filter(Boolean)
          .join(" · ");
      }

      const sitesRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${accessToken}` },
        redirect: "manual",
      });
      const sitesJson = JSON.parse(await sitesRes.text()) as {
        siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }>;
        error?: { message?: string };
      };
      if (sitesRes.ok) {
        accessibleSites = sitesJson.siteEntry || [];
      } else {
        discoveryError = [
          discoveryError,
          `sites.list HTTP ${sitesRes.status}: ${sitesJson.error?.message || "failed"}`,
        ]
          .filter(Boolean)
          .join(" · ");
      }
    } catch (e) {
      discoveryError = e instanceof Error ? e.message : String(e);
    }
  }

  const normalizedConfigured = ga4PropertyId?.startsWith("properties/")
    ? ga4PropertyId.slice("properties/".length)
    : ga4PropertyId;
  const match = Boolean(
    normalizedConfigured &&
      accessibleProperties.some((p) => p.propertyId === normalizedConfigured)
  );

  return NextResponse.json({
    connectedAccountEmailFromDb: google?.account_label || null,
    connectedAccountEmailFromToken: tokenEmail,
    connectedAccountGoogleId: tokenSub || google?.external_account_id || null,
    connectionStatus: google?.status || null,
    configured: {
      GA4_PROPERTY_ID: ga4PropertyId,
      SEARCH_CONSOLE_SITE_URL: searchConsoleSiteUrl,
    },
    accessibleGa4Properties: accessibleProperties,
    accessibleSearchConsoleSites: accessibleSites,
    configuredGa4PropertyMatchesAccessible: match,
    recommendedGa4PropertyId:
      match
        ? normalizedConfigured
        : accessibleProperties[0]?.propertyId || null,
    discoveryError,
  });
}
