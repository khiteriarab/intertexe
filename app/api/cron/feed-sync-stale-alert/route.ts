/**
 * Enhanced feed health alerts:
 * - FTP listing failure / 450
 * - zero files discovered
 * - zero upserts with files present
 * - checkpoint not advancing
 * - feed sync stale
 * - catalog nearly empty (displayable products only)
 * - homepage rails empty (separate from catalog health)
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STALE_MS = 48 * 60 * 60 * 1000;
const CHECKPOINT_STUCK_MS = 6 * 60 * 60 * 1000;
const ALERT_EMAIL = process.env.FEED_ALERT_EMAIL || "info@intertexe.com";

function authorize(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!expected) return null;
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function sendEmail(subject: string, text: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "INTERTEXE <info@mail.intertexe.com>",
        to: [ALERT_EMAIL],
        subject,
        text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  // Emergency mute: keep monitoring JSON, stop email spam during intentional pause.
  const alertsMuted = String(process.env.FEED_SYNC_ALERTS_MUTED || "") === "1";

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const [{ data: syncRow }, { data: chunkRow }, { data: dailyRow }, { count: displayable }, { count: feedItems }] =
    await Promise.all([
      supabase.from("system_status").select("value_json, updated_at").eq("key", "rakuten_feed_sync").maybeSingle(),
      supabase.from("system_status").select("value_json, updated_at").eq("key", "rakuten_feed_chunk_state").maybeSingle(),
      supabase.from("system_status").select("value_json, updated_at").eq("key", "daily_catalog_refresh").maybeSingle(),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_displayable", true),
      // homepage_feed_items has no `id` column — selecting id returns a null count and false "empty" alerts.
      supabase.from("homepage_feed_items").select("rail_key", { count: "exact", head: true }),
    ]);

  const sync = syncRow?.value_json || {};
  const chunk = chunkRow?.value_json || {};
  const updatedAt = syncRow?.updated_at ? new Date(syncRow.updated_at).getTime() : 0;
  const ageMs = updatedAt ? Date.now() - updatedAt : null;
  const syncStale = !updatedAt || (ageMs != null && ageMs > STALE_MS);
  const displayableCount = displayable ?? 0;
  const homepageFeedCount = feedItems ?? 0;
  // Catalog emptiness is about live products — not homepage rail cache.
  const catalogNearlyEmpty = displayableCount < 50;
  const homepageRailsEmpty = homepageFeedCount < 10;
  const dailyRefreshMissing = !dailyRow?.updated_at;

  const errors: string[] = Array.isArray(sync.errors)
    ? sync.errors.map(String)
    : [];
  const listingFailed =
    sync.listingFailed === true ||
    chunk.listingFailed === true ||
    errors.some((e) => /could not list|450|zero catalog/i.test(e));
  const zeroFiles = Number(sync.totalCatalogFiles ?? chunk.totalCatalogFiles ?? 0) === 0;
  const zeroUpserts =
    Number(sync.upserted ?? chunk.upserted ?? 0) === 0 &&
    Number(sync.filesProcessed ?? chunk.filesProcessed ?? 0) > 0;
  const checkpointStuck =
    Number(chunk.nextFileOffset ?? 0) > 0 &&
    Number(chunk.totalCatalogFiles ?? 0) === 0 &&
    chunkRow?.updated_at != null &&
    Date.now() - new Date(chunkRow.updated_at).getTime() > CHECKPOINT_STUCK_MS;

  const critical: string[] = [];
  const warnings: string[] = [];

  if (listingFailed) critical.push("FTP listing failed (450 / could not list)");
  if (zeroFiles && !syncStale) critical.push("Zero catalog files discovered");
  if (zeroUpserts) critical.push("Files processed but zero products upserted");
  if (checkpointStuck) critical.push("Checkpoint stuck (offset not advancing)");
  if (catalogNearlyEmpty) {
    critical.push(`Catalog nearly empty (displayable=${displayableCount})`);
  }

  if (syncStale) {
    const ageH = ageMs == null ? "?" : Math.round(ageMs / 3600000);
    // Stale sync with a healthy catalog is an ops warning, not a catalog wipe signal.
    if (catalogNearlyEmpty) critical.push(`Feed sync stale (${ageH}h)`);
    else warnings.push(`Feed sync stale (${ageH}h) — catalog still displayable=${displayableCount}`);
  }
  if (homepageRailsEmpty) {
    warnings.push(
      `Homepage rails empty (homepage_feed_items=${homepageFeedCount}) — run refresh_homepage_feeds; catalog displayable=${displayableCount}`
    );
  }
  if (dailyRefreshMissing) {
    warnings.push("Daily catalog refresh has never recorded a successful run");
  }

  const problems = [...critical, ...warnings];
  const isCritical = critical.length > 0;

  let emailed = false;
  if (problems.length && process.env.RESEND_API_KEY && !alertsMuted) {
    emailed = await sendEmail(
      isCritical ? "INTERTEXE CRITICAL: feed pipeline" : "INTERTEXE feed sync warning",
      [
        ...(critical.length ? ["Critical:", ...critical.map((p) => `- ${p}`), ""] : []),
        ...(warnings.length ? ["Warnings:", ...warnings.map((p) => `- ${p}`), ""] : []),
        `Last Rakuten sync: ${syncRow?.updated_at || "never"}`,
        `Last daily refresh: ${dailyRow?.updated_at || "never"}`,
        `nextFileOffset: ${chunk.nextFileOffset ?? "n/a"}`,
        `totalCatalogFiles: ${sync.totalCatalogFiles ?? chunk.totalCatalogFiles ?? "n/a"}`,
        `upserted: ${sync.upserted ?? chunk.upserted ?? "n/a"}`,
        `errors: ${errors.join(" | ") || "none"}`,
        `displayable: ${displayableCount}`,
        `homepage feed items: ${homepageFeedCount}`,
      ].join("\n")
    );
  }

  const stale = problems.length > 0;
  return NextResponse.json(
    {
      ok: !stale,
      stale,
      problems,
      critical,
      warnings,
      listingFailed,
      zeroFiles,
      zeroUpserts,
      checkpointStuck,
      syncStale,
      catalogNearlyEmpty,
      homepageRailsEmpty,
      dailyRefreshMissing,
      /** @deprecated use catalogNearlyEmpty — kept for older monitors */
      catalogEmpty: catalogNearlyEmpty,
      lastSync: syncRow?.updated_at || null,
      lastDailyRefresh: dailyRow?.updated_at || null,
      chunk,
      syncSummary: {
        upserted: sync.upserted,
        filesProcessed: sync.filesProcessed,
        totalCatalogFiles: sync.totalCatalogFiles,
        nextFileOffset: sync.nextFileOffset ?? chunk.nextFileOffset,
        errors,
      },
      displayable: displayableCount,
      homepageFeedItems: homepageFeedCount,
      emailed,
      alertsMuted,
    },
    { status: stale ? 207 : 200 }
  );
}
