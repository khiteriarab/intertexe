import { requireHqSession } from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import { daysAgo, formatCount, iso } from "../../../../lib/dashboard/metrics";
import { HqCard, HqEmptyState, HqPageHeader } from "../../components/HqUi";

export const metadata = { title: "Product Intelligence" };
export const dynamic = "force-dynamic";

export default async function HqProductIntelligencePage() {
  await requireHqSession();
  const supabase = getServerSupabase();
  const d30 = daysAgo(30);

  if (!supabase) {
    return (
      <div>
        <HqPageHeader title="Product Intelligence" description="Merchandising truth from scans and clickouts." />
        <HqEmptyState title="Database unavailable" body="Supabase client is not configured." />
      </div>
    );
  }

  const [scanned, clicked] = await Promise.all([
    supabase
      .from("scan_history")
      .select("product_id, product_name, brand, scanned_at")
      .not("product_id", "is", null)
      .gte("scanned_at", iso(d30))
      .limit(400),
    supabase
      .from("scanner_clickouts")
      .select("product_id, product_name, brand_slug, clicked_at")
      .not("product_id", "is", null)
      .gte("clicked_at", iso(d30))
      .limit(400),
  ]);

  const scanMap = new Map<string, { name: string; brand: string; scans: number }>();
  for (const row of scanned.data || []) {
    const id = String((row as any).product_id || "");
    if (!id) continue;
    const prev = scanMap.get(id) || {
      name: String((row as any).product_name || id),
      brand: String((row as any).brand || ""),
      scans: 0,
    };
    prev.scans += 1;
    scanMap.set(id, prev);
  }

  const clickSet = new Set(
    (clicked.data || []).map((r: any) => String(r.product_id || "")).filter(Boolean)
  );

  const scannedNeverClicked = [...scanMap.entries()]
    .filter(([id]) => !clickSet.has(id))
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.scans - a.scans)
    .slice(0, 30);

  const topClicked = Object.values(
    (clicked.data || []).reduce((acc: Record<string, any>, row: any) => {
      const id = String(row.product_id || "");
      if (!id) return acc;
      acc[id] = acc[id] || {
        id,
        name: row.product_name || id,
        brand: row.brand_slug || "",
        clicks: 0,
      };
      acc[id].clicks += 1;
      return acc;
    }, {})
  )
    .sort((a: any, b: any) => b.clicks - a.clicks)
    .slice(0, 30) as Array<{ id: string; name: string; brand: string; clicks: number }>;

  return (
    <div>
      <HqPageHeader
        title="Product Intelligence"
        description="Which products convert curiosity into clicks — and which are scanned but never pursued."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <HqCard title="Scanned, not clicked (30d sample)">
          {scannedNeverClicked.length ? (
            <ul className="space-y-3 text-sm">
              {scannedNeverClicked.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 border-b border-black/5 pb-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-black/45 truncate">{p.brand || p.id}</p>
                  </div>
                  <span className="tabular-nums text-black/60">{formatCount(p.scans)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50">No unmatched scan→click pairs in sample.</p>
          )}
        </HqCard>

        <HqCard title="Top clicked alternatives (30d sample)">
          {topClicked.length ? (
            <ul className="space-y-3 text-sm">
              {topClicked.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 border-b border-black/5 pb-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-black/45 truncate">{p.brand || p.id}</p>
                  </div>
                  <span className="tabular-nums text-black/60">{formatCount(p.clicks)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50">No scanner clickouts with product_id yet.</p>
          )}
        </HqCard>
      </div>
    </div>
  );
}
