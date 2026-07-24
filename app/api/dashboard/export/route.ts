import { NextResponse } from "next/server";
import { getHqSession } from "../../../../lib/dashboard/auth";
import { fetchHqCommercePage, fetchHqOverviewMetrics } from "../../../../lib/dashboard/metrics";

export const dynamic = "force-dynamic";

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") || "commerce";

  if (kind === "overview") {
    const m = await fetchHqOverviewMetrics();
    const rows = [
      ["metric", "value"],
      ["scans_today", m.scansToday.value],
      ["scans_yesterday", m.scansYesterday.value],
      ["scans_7d", m.scansLast7d.value],
      ["scans_prev_7d", m.scansPrev7d.value],
      ["consumers", m.usersTotal.value],
      ["favorites", m.favoritesTotal.value],
      ["collections", m.collectionsTotal.value],
      ["shop_clicks_7d", m.clickoutsLast7d.value],
      ["scanner_clicks_7d", m.scannerClickoutsLast7d.value],
      ["editorial_clicks_7d", m.editorialClickoutsLast7d.value],
      ["dpp_ready", m.dppReady.value],
      ["catalog_products", m.catalogProducts.value],
    ];
    const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="intertexe-overview.csv"',
      },
    });
  }

  const commerce = await fetchHqCommercePage();
  const rows = [
    ["source", "brand", "product", "product_id", "clicked_at", "converted"],
    ...commerce.recent.map((r: any) => [
      r.source,
      r.brand || r.brand_slug || "",
      r.product_name || "",
      r.product_id || "",
      r.clicked_at || "",
      r.converted ?? "",
    ]),
  ];
  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="intertexe-commerce-clickouts.csv"',
    },
  });
}
