import type { ProviderAdapter, TokenBundle } from "../types";
import { getServerSupabase } from "@/lib/supabase-service-client";
import { ingestGmailOutreach } from "../../gmail-outreach";

/** Gmail uses its own OAuth client so Analytics/Search Console is not overwritten. */
function gmailClientId(): string {
  return (
    process.env.GMAIL_OAUTH_CLIENT_ID?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    ""
  );
}

function gmailClientSecret(): string {
  return (
    process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    ""
  );
}

/** Read-only Gmail headers + the outreach contact sheet. Bodies are never stored. */
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
].join(" ");

async function readGoogleJson(res: Response, label: string): Promise<Record<string, unknown>> {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  const prefix = text.slice(0, 200).replace(/\s+/g, " ").trim();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(
      `${label} returned non-JSON (HTTP ${res.status}, content-type=${contentType || "unknown"}). Body starts: ${prefix}`
    );
  }
}

function mapGoogleToken(json: Record<string, unknown>): TokenBundle {
  const expiresIn = Number(json.expires_in || 3600);
  return {
    accessToken: String(json.access_token),
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    tokenType: String(json.token_type || "Bearer"),
    scopes: String(json.scope || "")
      .split(/\s+/)
      .filter(Boolean),
  };
}

export const gmailAdapter: ProviderAdapter = {
  id: "gmail",

  isConfigured() {
    return Boolean(gmailClientId() && gmailClientSecret());
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const clientId = gmailClientId();
    if (!clientId) throw new Error("GMAIL_OAUTH_CLIENT_ID is not configured");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "false",
      login_hint: process.env.GMAIL_OUTREACH_ADDRESS || "khiteri@intertexe.com",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const body = new URLSearchParams({
      code,
      client_id: gmailClientId(),
      client_secret: gmailClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual",
    });
    const json = await readGoogleJson(res, "Gmail token exchange");
    if (!res.ok) {
      throw new Error(String(json.error_description || json.error || "Gmail token exchange failed"));
    }
    return mapGoogleToken(json);
  },

  async refreshAccessToken(refreshToken: string) {
    const body = new URLSearchParams({
      client_id: gmailClientId(),
      client_secret: gmailClientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual",
    });
    const json = await readGoogleJson(res, "Gmail token refresh");
    if (!res.ok) {
      throw new Error(String(json.error_description || json.error || "Gmail refresh failed"));
    }
    return { ...mapGoogleToken(json), refreshToken };
  },

  async enrichAccount(accessToken: string) {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "manual",
    });
    if (!res.ok) return {};
    const u = (await readGoogleJson(res, "Gmail userinfo")) as {
      email?: string;
      id?: string;
      name?: string;
    };
    return {
      accountLabel: u.email || u.name || null,
      externalAccountId: u.id || null,
    };
  },

  async syncMetrics({ accessToken, metadata }) {
    const workspaceId = String(metadata.workspaceId || "");
    const supabase = getServerSupabase();
    if (!workspaceId || !supabase) {
      return { metrics: { skipped: true, reason: "missing_workspace" } };
    }
    const ingest = await ingestGmailOutreach({
      supabase,
      workspaceId,
      accessToken,
      connectedEmail: String(metadata.accountLabel || metadata.email || "") || null,
    });
    return {
      metrics: {
        syncedAt: new Date().toISOString(),
        ...ingest,
      },
    };
  },
};
