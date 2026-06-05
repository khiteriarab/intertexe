import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.SMOKE_TEST_BASE_URL || "https://www.intertexe.com";

const TESTS = [
  { name: "catalog", url: "/api/catalog?region=us&limit=1" },
  { name: "catalog_dresses", url: "/api/catalog?region=us&limit=1&category=dresses" },
  { name: "catalog_silk", url: "/api/catalog?region=us&limit=1&fiber=silk" },
  { name: "sale", url: "/api/sale?region=us&limit=1&skipCount=1" },
  { name: "sale_skirts", url: "/api/sale?region=us&limit=1&category=skirts" },
  { name: "designers", url: "/api/designers?region=us&limit=50" },
];

export async function GET() {
  const results: Record<string, Record<string, unknown>> = {};

  for (const test of TESTS) {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL}${test.url}`, { cache: "no-store" });
      const data = await res.json();
      const productCount = Array.isArray(data.products) ? data.products.length : 0;
      const designerCount = Array.isArray(data.designers)
        ? data.designers.length
        : Array.isArray(data)
          ? data.length
          : 0;
      const hasProducts = productCount > 0 || designerCount > 0;
      const countOk =
        test.name === "catalog" || test.name === "catalog_silk"
          ? res.ok && data.error !== "failed"
          : hasProducts;
      results[test.name] = {
        ok: res.ok && countOk,
        time: Date.now() - start,
        hasProducts,
        total: data.total ?? null,
        error: data.error ?? null,
      };
    } catch (e) {
      results[test.name] = {
        ok: false,
        error: String(e),
        time: Date.now() - start,
      };
    }
  }

  const allPassing = Object.values(results).every(
    (r) => r.ok && r.hasProducts !== false
  );

  return NextResponse.json({
    passing: allPassing,
    timestamp: new Date().toISOString(),
    results,
  });
}
