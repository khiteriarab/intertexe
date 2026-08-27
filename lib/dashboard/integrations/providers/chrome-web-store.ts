import type { ProviderAdapter, TokenBundle } from "../types";
import { getServerSupabase } from "../../../supabase-service-client";
import {
  CHROME_WEB_STORE_ITEM_ID,
  chromeWebStoreDetailUrl,
  isChromeWebStoreItemId,
} from "../../../chrome-extension";

/**
 * Chrome Web Store has no public installs API (unlike App Store Connect).
 * HQ stores the listing id, snapshots first-party saves/clickouts, and optionally
 * records weekly users/installs pasted from the publisher dashboard.
 * Website “Add to Chrome” clicks are never treated as installs.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeChromeWebStoreListingId(raw: string): string {
  const id = raw.trim().toLowerCase();
  if (!isChromeWebStoreItemId(id)) {
    throw new Error("Chrome Web Store item ID must be 32 lowercase letters.");
  }
  return id;
}

export function parseOptionalCount(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function chromeWebStoreBundle(meta: {
  listingId?: string;
  weeklyUsers?: number | null;
  weeklyInstalls?: number | null;
  accountLabel?: string;
}): TokenBundle {
  const listingId = normalizeChromeWebStoreListingId(meta.listingId || CHROME_WEB_STORE_ITEM_ID);
  const weeklyUsers = meta.weeklyUsers ?? null;
  const weeklyInstalls = meta.weeklyInstalls ?? null;
  return {
    accessToken: "cws-listing",
    refreshToken: null,
    expiresAt: null,
    tokenType: "cws_listing",
    accountLabel: meta.accountLabel || `Chrome Web Store ${listingId}`,
    externalAccountId: listingId,
    metadata: {
      listingId,
      listingUrl: chromeWebStoreDetailUrl(listingId),
      ...(weeklyUsers != null ? { weeklyUsers } : {}),
      ...(weeklyInstalls != null ? { weeklyInstalls } : {}),
      ...(weeklyUsers != null || weeklyInstalls != null
        ? { publisherReportedAt: new Date().toISOString() }
        : {}),
    },
  };
}

async function countExact(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  table: string,
  apply: (q: any) => any
): Promise<{ count: number | null; error: string | null }> {
  const { count, error } = await apply(
    supabase.from(table).select("id", { count: "exact", head: true })
  );
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

export const chromeWebStoreAdapter: ProviderAdapter = {
  id: "chrome_web_store",

  isConfigured() {
    return true;
  },

  getAuthorizationUrl() {
    throw new Error("Chrome Web Store uses listing connect, not OAuth redirect");
  },

  async exchangeCode() {
    throw new Error("Chrome Web Store uses listing connect, not OAuth code exchange");
  },

  async syncMetrics({ metadata }) {
    const listingIdRaw = String(metadata.listingId || CHROME_WEB_STORE_ITEM_ID);
    const setupWarnings: string[] = [];
    let listingId = CHROME_WEB_STORE_ITEM_ID;
    try {
      listingId = normalizeChromeWebStoreListingId(listingIdRaw);
    } catch (err) {
      return {
        metrics: {
          syncedAt: new Date().toISOString(),
          chromeError: err instanceof Error ? err.message : String(err),
        },
      };
    }

    const weeklyUsers = parseOptionalCount(metadata.weeklyUsers);
    const weeklyInstalls = parseOptionalCount(metadata.weeklyInstalls);

    const supabase = getServerSupabase();
    if (!supabase) {
      return {
        metrics: {
          syncedAt: new Date().toISOString(),
          listingId,
          listingUrl: chromeWebStoreDetailUrl(listingId),
          weeklyUsers,
          weeklyInstalls,
          installsReady: weeklyInstalls != null,
          usageReady: false,
          chromeError: "Database unavailable",
          setupWarnings,
        },
      };
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();
    const d7 = new Date(now - 7 * DAY_MS).toISOString();
    const d14 = new Date(now - 14 * DAY_MS).toISOString();
    const d30 = new Date(now - 30 * DAY_MS).toISOString();

    const workspaceId = String(metadata.workspaceId || "").trim();

    const [savesToday, saves7d, savesPrev7d, saves30d, clickouts7d, clickouts30d, savers30d] =
      await Promise.all([
        countExact(supabase, "external_captures", (q) =>
          q.eq("source_app", "chrome_extension").gte("created_at", todayIso)
        ),
        countExact(supabase, "external_captures", (q) =>
          q.eq("source_app", "chrome_extension").gte("created_at", d7)
        ),
        countExact(supabase, "external_captures", (q) =>
          q.eq("source_app", "chrome_extension").gte("created_at", d14).lt("created_at", d7)
        ),
        countExact(supabase, "external_captures", (q) =>
          q.eq("source_app", "chrome_extension").gte("created_at", d30)
        ),
        workspaceId
          ? countExact(supabase, "hq_customer_events", (q) =>
              q
                .eq("workspace_id", workspaceId)
                .eq("source", "chrome_extension")
                .eq("event_name", "affiliate_click")
                .gte("event_timestamp", d7)
            )
          : Promise.resolve({ count: null as number | null, error: null as string | null }),
        workspaceId
          ? countExact(supabase, "hq_customer_events", (q) =>
              q
                .eq("workspace_id", workspaceId)
                .eq("source", "chrome_extension")
                .eq("event_name", "affiliate_click")
                .gte("event_timestamp", d30)
            )
          : Promise.resolve({ count: null as number | null, error: null as string | null }),
        supabase
          .from("external_captures")
          .select("user_id")
          .eq("source_app", "chrome_extension")
          .gte("created_at", d30)
          .limit(5000),
      ]);

    const countErrors = [
      savesToday.error,
      saves7d.error,
      savesPrev7d.error,
      saves30d.error,
      clickouts7d.error,
      clickouts30d.error,
      savers30d.error?.message || null,
    ].filter((m): m is string => Boolean(m));
    for (const message of countErrors) {
      if (!setupWarnings.includes(message)) setupWarnings.push(message);
    }

    const uniqueSavers30d = savers30d.error
      ? null
      : new Set(
          (savers30d.data || [])
            .map((row: { user_id?: string | null }) => String(row.user_id || "").trim())
            .filter(Boolean)
        ).size;

    const usageReady = saves7d.count != null;

    return {
      metrics: {
        syncedAt: nowIso,
        listingId,
        listingUrl: chromeWebStoreDetailUrl(listingId),
        weeklyUsers,
        weeklyInstalls,
        installsReady: weeklyInstalls != null,
        usageReady,
        savesToday: savesToday.count,
        saves7d: saves7d.count,
        savesPrev7d: savesPrev7d.count,
        saves30d: saves30d.count,
        uniqueSavers30d,
        clickouts7d: clickouts7d.count,
        clickouts30d: clickouts30d.count,
        ...(setupWarnings.length ? { setupWarnings } : {}),
      },
    };
  },
};
