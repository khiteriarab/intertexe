import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

function getSupabase(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const BASE = "https://www.intertexe.com";
const TODAY = new Date().toISOString().split("T")[0];
const CHUNK = 1000;

function xmlHeader() {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
}

function urlEntry(path: string, opts: { priority: string; freq: string; lastmod?: string }) {
  const loc = path ? `${BASE}${path}` : BASE;
  return `  <url><loc>${loc}</loc><lastmod>${opts.lastmod || TODAY}</lastmod><changefreq>${opts.freq}</changefreq><priority>${opts.priority}</priority></url>\n`;
}

export async function GET(request: Request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const page = parseInt(searchParams.get("page") || "0", 10);

  if (!supabase) {
    let xml = xmlHeader();
    xml += urlEntry("", { priority: "1.0", freq: "daily" });
    xml += urlEntry("/shop", { priority: "0.9", freq: "daily" });
    xml += "</urlset>";
    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml", "Cache-Control": "public, s-maxage=3600" },
    });
  }

  try {
    if (!type) {
      const { count: designerCount } = await supabase.from("designers").select("*", { count: "exact", head: true });
      const { count: productCount } = await supabase.from("products").select("*", { count: "exact", head: true }).gte("natural_fiber_percent", 80).not("image_url", "is", null).neq("image_url", "");

      const designerPages = Math.ceil((designerCount || 0) / CHUNK);
      const productPages = Math.ceil((productCount || 0) / CHUNK);

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      xml += `  <sitemap><loc>${BASE}/api/sitemap?type=pages</loc><lastmod>${TODAY}</lastmod></sitemap>\n`;
      for (let i = 0; i < designerPages; i++) {
        xml += `  <sitemap><loc>${BASE}/api/sitemap?type=designers&amp;page=${i}</loc><lastmod>${TODAY}</lastmod></sitemap>\n`;
      }
      for (let i = 0; i < productPages; i++) {
        xml += `  <sitemap><loc>${BASE}/api/sitemap?type=products&amp;page=${i}</loc><lastmod>${TODAY}</lastmod></sitemap>\n`;
      }
      xml += '</sitemapindex>';

      return new NextResponse(xml, {
        headers: { "Content-Type": "application/xml", "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
      });
    }

    if (type === "pages") {
      let xml = xmlHeader();

      xml += urlEntry("", { priority: "1.0", freq: "daily" });
      xml += urlEntry("/shop", { priority: "0.9", freq: "daily" });
      xml += urlEntry("/sale", { priority: "0.8", freq: "daily" });
      xml += urlEntry("/materials", { priority: "0.9", freq: "weekly" });
      xml += urlEntry("/designers", { priority: "0.9", freq: "weekly" });
      xml += urlEntry("/designers/all", { priority: "0.8", freq: "weekly" });

      const materials = ["silk", "cotton", "linen", "wool", "cashmere"];
      for (const m of materials) {
        xml += urlEntry(`/materials/${m}`, { priority: "0.8", freq: "weekly" });
      }

      const subcategories = [
        "silk-dresses", "silk-tops", "silk-blouses", "silk-skirts",
        "linen-dresses", "linen-pants", "linen-shirts", "linen-tops",
        "cotton-dresses", "cotton-tops", "cotton-shirts", "cotton-pants",
        "cashmere-sweaters", "cashmere-knits",
        "wool-sweaters", "wool-coats", "wool-pants",
      ];
      for (const s of subcategories) {
        xml += urlEntry(`/materials/${s}`, { priority: "0.7", freq: "weekly" });
      }

      const clothingPages = ["cotton-clothing", "linen-clothing", "silk-clothing", "wool-clothing", "cashmere-clothing", "natural-fabrics"];
      for (const p of clothingPages) {
        xml += urlEntry(`/${p}`, { priority: "0.8", freq: "weekly" });
      }

      xml += urlEntry("/quiz", { priority: "0.6", freq: "monthly" });
      xml += urlEntry("/scanner", { priority: "0.6", freq: "monthly" });
      xml += urlEntry("/chat", { priority: "0.5", freq: "monthly" });
      xml += urlEntry("/about", { priority: "0.4", freq: "monthly" });
      xml += urlEntry("/contact", { priority: "0.4", freq: "monthly" });
      xml += urlEntry("/privacy", { priority: "0.2", freq: "yearly" });
      xml += urlEntry("/terms", { priority: "0.2", freq: "yearly" });

      xml += '</urlset>';
      return new NextResponse(xml, {
        headers: { "Content-Type": "application/xml", "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
      });
    }

    if (type === "designers") {
      const start = page * CHUNK;
      const { data: designers } = await supabase
        .from("designers")
        .select("slug, natural_fiber_percent")
        .order("name")
        .range(start, start + CHUNK - 1);

      let xml = xmlHeader();
      for (const d of (designers || [])) {
        const hasFiberData = d.natural_fiber_percent != null && d.natural_fiber_percent > 0;
        xml += urlEntry(`/designers/${d.slug}`, {
          priority: hasFiberData ? "0.7" : "0.4",
          freq: hasFiberData ? "weekly" : "monthly",
        });
      }
      xml += '</urlset>';
      return new NextResponse(xml, {
        headers: { "Content-Type": "application/xml", "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
      });
    }

    if (type === "products") {
      const start = page * CHUNK;
      const { data: products } = await supabase
        .from("products")
        .select("id")
        .gte("natural_fiber_percent", 80)
        .not("image_url", "is", null)
        .neq("image_url", "")
        .order("natural_fiber_percent", { ascending: false })
        .range(start, start + CHUNK - 1);

      let xml = xmlHeader();
      for (const p of (products || [])) {
        xml += urlEntry(`/product/${p.id}`, { priority: "0.5", freq: "weekly" });
      }
      xml += '</urlset>';
      return new NextResponse(xml, {
        headers: { "Content-Type": "application/xml", "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
      });
    }

    return new NextResponse("Invalid sitemap type", { status: 400 });
  } catch (error) {
    return new NextResponse("Error generating sitemap", { status: 500 });
  }
}
