import type { SupabaseClient } from "@supabase/supabase-js";
import { EMAIL_FROM } from "./email-constants";

export const CATALOG_ALERT_EMAIL = "info@intertexe.com";

export type CatalogHealthSnapshot = {
  shouldBeLiveCount: number;
  brandsAffected: number;
  brandsNeedingAttention: { brand_name: string; brand_slug: string; count: number }[];
  classification: Record<string, number>;
  liveApparelTotal: number;
};

function hasPositivePrice(price: unknown): boolean {
  if (price == null) return false;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0;
}

/** Count products that meet ingest criteria but are not approved=yes + active. */
export async function fetchCatalogHealthSnapshot(
  supabase: SupabaseClient
): Promise<CatalogHealthSnapshot> {
  const brandCounts = new Map<string, { brand_name: string; brand_slug: string; count: number }>();
  let shouldBeLiveCount = 0;

  for (let offset = 0; offset < 50000; offset += 1000) {
    const { data, error } = await supabase
      .from("products")
      .select("brand_name, brand_slug, approved, is_active, natural_fiber_percent, composition, image_url, price")
      .gte("natural_fiber_percent", 80)
      .not("composition", "is", null)
      .neq("composition", "")
      .neq("approved", "yes")
      .range(offset, offset + 999);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (!row.image_url || !String(row.image_url).trim()) continue;
      if (!hasPositivePrice(row.price)) continue;
      shouldBeLiveCount += 1;
      const slug = String(row.brand_slug || "unknown").toLowerCase();
      const name = String(row.brand_name || slug);
      const cur = brandCounts.get(slug) || { brand_name: name, brand_slug: slug, count: 0 };
      cur.count += 1;
      brandCounts.set(slug, cur);
    }

    if (data.length < 1000) break;
  }

  const brandsNeedingAttention = [...brandCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  const classification: Record<string, number> = {};
  for (let offset = 0; offset < 200000; offset += 5000) {
    const { data, error } = await supabase
      .from("product_offer_classification")
      .select("completeness_status")
      .range(offset, offset + 4999);
    if (error) break;
    if (!data?.length) break;
    for (const row of data) {
      const s = String(row.completeness_status || "unknown");
      classification[s] = (classification[s] || 0) + 1;
    }
    if (data.length < 5000) break;
  }

  const { count: liveApparelTotal } = await supabase
    .from("live_products_apparel")
    .select("*", { count: "exact", head: true });

  return {
    shouldBeLiveCount,
    brandsAffected: brandCounts.size,
    brandsNeedingAttention,
    classification,
    liveApparelTotal: liveApparelTotal ?? 0,
  };
}

export async function sendCatalogDailyEmail(
  supabase: SupabaseClient,
  opts?: { syncSummary?: string; urgentThreshold?: number }
): Promise<{ sent: boolean; snapshot: CatalogHealthSnapshot }> {
  const snapshot = await fetchCatalogHealthSnapshot(supabase);
  const urgentThreshold = opts?.urgentThreshold ?? 100;
  const urgent = snapshot.shouldBeLiveCount >= urgentThreshold;
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const brandRows = snapshot.brandsNeedingAttention
    .map((b) => `<tr><td>${b.brand_name}</td><td>${b.count}</td></tr>`)
    .join("");

  const classRows = Object.entries(snapshot.classification)
    .map(([k, v]) => `<tr><td>${k}</td><td>${v.toLocaleString()}</td></tr>`)
    .join("");

  const html = `
    <h2>INTERTEXE catalog health — ${dateStr}</h2>
    ${opts?.syncSummary ? `<p><strong>Sync:</strong> ${opts.syncSummary}</p>` : ""}
    <ul>
      <li>Live apparel offers: <strong>${snapshot.liveApparelTotal.toLocaleString()}</strong></li>
      <li>Should be live but not approved: <strong>${snapshot.shouldBeLiveCount.toLocaleString()}</strong></li>
      <li>Brands affected: <strong>${snapshot.brandsAffected.toLocaleString()}</strong></li>
    </ul>
    <h3>Top brands needing approval</h3>
    <table border="1" cellpadding="6" cellspacing="0"><tr><th>Brand</th><th>Pending</th></tr>${brandRows || "<tr><td colspan=2>None</td></tr>"}</table>
    <h3>Classification status</h3>
    <table border="1" cellpadding="6" cellspacing="0"><tr><th>Status</th><th>Count</th></tr>${classRows || "<tr><td colspan=2>No rows</td></tr>"}</table>
  `;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[catalog-daily-report] RESEND_API_KEY missing — skipping email");
    return { sent: false, snapshot };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || EMAIL_FROM,
      to: [CATALOG_ALERT_EMAIL],
      subject: urgent
        ? `URGENT: Intertexe Catalog — ${snapshot.shouldBeLiveCount} products need approval (${dateStr})`
        : `Intertexe Catalog Update — ${dateStr}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[catalog-daily-report] Resend failed:", res.status, body);
    return { sent: false, snapshot };
  }

  return { sent: true, snapshot };
}
