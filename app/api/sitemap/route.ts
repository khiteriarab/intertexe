import { NextResponse } from "next/server";
import { fetchAllProductIds, fetchAllDesignerSlugs } from "../../../lib/supabase-server";

export const revalidate = 86400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const page = parseInt(searchParams.get("page") || "0", 10);

  const baseUrl = "https://www.intertexe.com";

  try {
    if (!type) {
      const [productIds] = await Promise.all([fetchAllProductIds()]);
      const productPages = Math.ceil(productIds.length / 5000);

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      xml += `  <sitemap><loc>${baseUrl}/api/sitemap?type=pages</loc></sitemap>\n`;
      xml += `  <sitemap><loc>${baseUrl}/api/sitemap?type=designers</loc></sitemap>\n`;
      for (let i = 0; i < productPages; i++) {
        xml += `  <sitemap><loc>${baseUrl}/api/sitemap?type=products&amp;page=${i}</loc></sitemap>\n`;
      }
      xml += '</sitemapindex>';

      return new NextResponse(xml, {
        headers: {
          "Content-Type": "application/xml",
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      });
    }

    if (type === "pages") {
      const staticPages = [
        { path: "", priority: "1.0", freq: "daily" },
        { path: "/materials", priority: "0.9", freq: "weekly" },
        { path: "/shop", priority: "0.9", freq: "daily" },
        { path: "/sale", priority: "0.8", freq: "daily" },
        { path: "/designers", priority: "0.9", freq: "weekly" },
        { path: "/designers/all", priority: "0.7", freq: "weekly" },
        { path: "/quiz", priority: "0.7", freq: "monthly" },
        { path: "/scanner", priority: "0.7", freq: "monthly" },
        { path: "/chat", priority: "0.6", freq: "monthly" },
        { path: "/about", priority: "0.5", freq: "monthly" },
        { path: "/contact", priority: "0.5", freq: "monthly" },
        { path: "/privacy", priority: "0.3", freq: "yearly" },
        { path: "/terms", priority: "0.3", freq: "yearly" },
        { path: "/materials/silk", priority: "0.8", freq: "weekly" },
        { path: "/materials/cotton", priority: "0.8", freq: "weekly" },
        { path: "/materials/linen", priority: "0.8", freq: "weekly" },
        { path: "/materials/wool", priority: "0.8", freq: "weekly" },
        { path: "/materials/cashmere", priority: "0.8", freq: "weekly" },
        { path: "/materials/linen-dresses", priority: "0.7", freq: "weekly" },
        { path: "/materials/linen-pants", priority: "0.7", freq: "weekly" },
        { path: "/materials/linen-shirts", priority: "0.7", freq: "weekly" },
        { path: "/materials/linen-tops", priority: "0.7", freq: "weekly" },
        { path: "/materials/silk-dresses", priority: "0.7", freq: "weekly" },
        { path: "/materials/silk-tops", priority: "0.7", freq: "weekly" },
        { path: "/materials/silk-blouses", priority: "0.7", freq: "weekly" },
        { path: "/materials/silk-skirts", priority: "0.7", freq: "weekly" },
        { path: "/materials/cotton-dresses", priority: "0.7", freq: "weekly" },
        { path: "/materials/cotton-tops", priority: "0.7", freq: "weekly" },
        { path: "/materials/cotton-shirts", priority: "0.7", freq: "weekly" },
        { path: "/materials/cotton-pants", priority: "0.7", freq: "weekly" },
        { path: "/materials/cashmere-sweaters", priority: "0.7", freq: "weekly" },
        { path: "/materials/cashmere-knits", priority: "0.7", freq: "weekly" },
        { path: "/materials/wool-sweaters", priority: "0.7", freq: "weekly" },
        { path: "/materials/wool-coats", priority: "0.7", freq: "weekly" },
        { path: "/materials/wool-pants", priority: "0.7", freq: "weekly" },
        { path: "/cotton-clothing", priority: "0.8", freq: "weekly" },
        { path: "/linen-clothing", priority: "0.8", freq: "weekly" },
        { path: "/silk-clothing", priority: "0.8", freq: "weekly" },
        { path: "/wool-clothing", priority: "0.8", freq: "weekly" },
        { path: "/cashmere-clothing", priority: "0.8", freq: "weekly" },
        { path: "/natural-fabrics", priority: "0.8", freq: "weekly" },
      ];

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      for (const p of staticPages) {
        xml += `  <url><loc>${baseUrl}${p.path}</loc><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>\n`;
      }
      xml += '</urlset>';

      return new NextResponse(xml, {
        headers: {
          "Content-Type": "application/xml",
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      });
    }

    if (type === "designers") {
      const designerSlugs = await fetchAllDesignerSlugs();

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      for (const slug of designerSlugs) {
        xml += `  <url><loc>${baseUrl}/designers/${slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
      }
      xml += '</urlset>';

      return new NextResponse(xml, {
        headers: {
          "Content-Type": "application/xml",
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      });
    }

    if (type === "products") {
      const productIds = await fetchAllProductIds();
      const start = page * 5000;
      const chunk = productIds.slice(start, start + 5000);

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      for (const id of chunk) {
        xml += `  <url><loc>${baseUrl}/product/${id}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
      }
      xml += '</urlset>';

      return new NextResponse(xml, {
        headers: {
          "Content-Type": "application/xml",
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      });
    }

    return new NextResponse("Invalid sitemap type", { status: 400 });
  } catch (error) {
    return new NextResponse("Error generating sitemap", { status: 500 });
  }
}
