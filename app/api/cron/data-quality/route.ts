import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NATURAL_FIBERS = [
  "cotton", "linen", "flax", "silk", "wool", "cashmere", "mohair",
  "alpaca", "hemp", "jute", "ramie", "merino", "angora", "camel",
  "yak", "bamboo linen", "kapok", "pima", "supima", "egyptian cotton",
];

const SYNTHETIC_FIBERS = [
  "viscose", "rayon", "modal", "lyocell", "tencel", "acetate",
  "polyester", "nylon", "polyamide", "acrylic", "elastane", "spandex",
  "lycra", "metallic", "rubber", "polyurethane", "polypropylene",
  "cupro", "triacetate",
];

function calcNaturalPercent(composition: string): number {
  if (!composition) return 0;
  const parts = composition.toLowerCase().split(/[,;\/]+/);
  let naturalTotal = 0;
  let totalParsed = 0;

  for (const part of parts) {
    const pctMatch = part.match(/([\d.]+)\s*%/);
    if (!pctMatch) continue;
    const pct = parseFloat(pctMatch[1]);
    totalParsed += pct;

    const isNatural = NATURAL_FIBERS.some((f) => part.includes(f));
    const isSynthetic = SYNTHETIC_FIBERS.some((f) => part.includes(f));

    if (isNatural && !isSynthetic) {
      naturalTotal += pct;
    }
  }

  if (totalParsed === 0) {
    const lower = composition.toLowerCase();
    const isNatural = NATURAL_FIBERS.some((f) => lower.includes(f));
    const isSynthetic = SYNTHETIC_FIBERS.some((f) => lower.includes(f));
    if (isNatural && !isSynthetic) return 100;
    if (isSynthetic && !isNatural) return 0;
    return 0;
  }

  return Math.round(naturalTotal);
}

function categorizeProduct(name: string, currentCategory: string): string | null {
  const t = name.toLowerCase();

  if (t.includes("skirt") && currentCategory !== "bottoms") return "bottoms";
  if (
    (t.includes("pant") || t.includes("trouser") || t.includes("jean") ||
      t.includes("legging")) &&
    currentCategory !== "bottoms"
  ) return "bottoms";
  if (
    (t.includes("jacket") || t.includes("coat") || t.includes("blazer") ||
      t.includes("vest") || t.includes("trench") || t.includes("parka")) &&
    currentCategory !== "outerwear"
  ) return "outerwear";
  if (
    (t.includes("sweater") || t.includes("cardigan") || t.includes("pullover") ||
      t.includes("jumper")) &&
    currentCategory !== "knitwear"
  ) return "knitwear";

  return null;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
  }

  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    fixes: [],
    flagged: [],
    stats: {},
  };

  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, brand_name, composition, natural_fiber_percent, category, image_url, url, price");

    if (error || !products) {
      return NextResponse.json({ error: "Failed to fetch products", details: error }, { status: 500 });
    }

    report.stats.totalProducts = products.length;

    let fiberFixes = 0;
    let categoryFixes = 0;
    let duplicatesRemoved = 0;

    const seenUrls = new Map<string, string>();
    const duplicateIds: string[] = [];

    for (const product of products) {
      if (product.url) {
        if (seenUrls.has(product.url)) {
          duplicateIds.push(product.id);
          report.fixes.push({
            type: "duplicate_removed",
            id: product.id,
            name: product.name,
            duplicateOf: seenUrls.get(product.url),
          });
        } else {
          seenUrls.set(product.url, product.id);
        }
      }

      const correctPct = calcNaturalPercent(product.composition || "");
      if (correctPct !== product.natural_fiber_percent) {
        const { error: updateError } = await supabase
          .from("products")
          .update({ natural_fiber_percent: correctPct })
          .eq("id", product.id);

        if (!updateError) {
          fiberFixes++;
          report.fixes.push({
            type: "fiber_percent_corrected",
            id: product.id,
            name: product.name,
            from: product.natural_fiber_percent,
            to: correctPct,
            composition: product.composition,
          });
        }
      }

      const correctCategory = categorizeProduct(product.name, product.category);
      if (correctCategory) {
        const { error: catError } = await supabase
          .from("products")
          .update({ category: correctCategory })
          .eq("id", product.id);

        if (!catError) {
          categoryFixes++;
          report.fixes.push({
            type: "category_corrected",
            id: product.id,
            name: product.name,
            from: product.category,
            to: correctCategory,
          });
        }
      }

      if (correctPct < 95) {
        report.flagged.push({
          id: product.id,
          name: product.name,
          brand: product.brand_name,
          composition: product.composition,
          naturalPercent: correctPct,
          reason: "Below 95% natural fiber threshold",
        });
      }

      if (!product.image_url) {
        report.flagged.push({
          id: product.id,
          name: product.name,
          brand: product.brand_name,
          reason: "Missing product image",
        });
      }
    }

    if (duplicateIds.length > 0) {
      const { error: delError } = await supabase
        .from("products")
        .delete()
        .in("id", duplicateIds);
      if (!delError) duplicatesRemoved = duplicateIds.length;
    }

    const { data: finalProducts } = await supabase
      .from("products")
      .select("category, natural_fiber_percent, image_url");

    if (finalProducts) {
      const catCounts: Record<string, number> = {};
      let above95 = 0;
      let below95 = 0;
      let missingImages = 0;

      for (const p of finalProducts) {
        catCounts[p.category] = (catCounts[p.category] || 0) + 1;
        if (p.natural_fiber_percent >= 95) above95++;
        else below95++;
        if (!p.image_url) missingImages++;
      }

      report.stats = {
        totalProducts: finalProducts.length,
        above95NaturalFiber: above95,
        below95NaturalFiber: below95,
        missingImages,
        byCategory: catCounts,
        fiberPercentFixed: fiberFixes,
        categoriesFixed: categoryFixes,
        duplicatesRemoved,
      };
    }

    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
