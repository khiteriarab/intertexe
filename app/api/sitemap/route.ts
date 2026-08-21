import { NextResponse } from "next/server";
import { SITE_URL } from "../../../lib/seo-international";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

/**
 * Legacy sitemap endpoint. Google Search Console should use /sitemap.xml.
 * Keep this alias so previously submitted /api/sitemap URLs still resolve.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const page = searchParams.get("page") || "0";

  if (!type) {
    return NextResponse.redirect(`${SITE_URL}/sitemap.xml`, 308);
  }
<<<<<<< Updated upstream

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
      for (const slug of COLLECTION_SLUGS) {
        xml += urlEntry(`/collections/${slug}`, { priority: "0.8", freq: "weekly" });
      }
      xml += urlEntry("/platform", { priority: "0.5", freq: "monthly" });
      xml += urlEntry("/platform/demo", { priority: "0.55", freq: "weekly" });
      xml += urlEntry("/platform/docs", { priority: "0.45", freq: "monthly" });
      xml += urlEntry("/platform/request", { priority: "0.4", freq: "monthly" });
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
=======
  if (type === "pages") {
    return NextResponse.redirect(`${SITE_URL}/sitemap/static.xml`, 308);
>>>>>>> Stashed changes
  }
  if (type === "designers") {
    return NextResponse.redirect(`${SITE_URL}/sitemap/brands-${page}.xml`, 308);
  }
  if (type === "products") {
    return NextResponse.redirect(`${SITE_URL}/sitemap/products-${page}.xml`, 308);
  }
  return new NextResponse("Invalid sitemap type", { status: 400 });
}
