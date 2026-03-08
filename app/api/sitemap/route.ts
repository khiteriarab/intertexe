import { NextResponse } from "next/server";
import { fetchAllProductIds, fetchAllDesignerSlugs } from "../../../lib/supabase-server";

export async function GET() {
  try {
    const [productIds, designerSlugs] = await Promise.all([
      fetchAllProductIds(),
      fetchAllDesignerSlugs(),
    ]);

    const baseUrl = "https://www.intertexe.com";

    const staticPages = [
      "", "/materials", "/shop", "/designers", "/designers/all",
      "/quiz", "/scanner", "/chat", "/about", "/contact", "/privacy", "/terms",
      "/materials/silk", "/materials/cotton", "/materials/linen", "/materials/wool", "/materials/cashmere",
      "/materials/linen-dresses", "/materials/linen-pants", "/materials/linen-shirts", "/materials/linen-tops",
      "/materials/silk-dresses", "/materials/silk-tops", "/materials/silk-blouses", "/materials/silk-skirts",
      "/materials/cotton-dresses", "/materials/cotton-tops", "/materials/cotton-shirts", "/materials/cotton-pants",
      "/materials/cashmere-sweaters", "/materials/cashmere-knits",
      "/materials/wool-sweaters", "/materials/wool-coats", "/materials/wool-pants",
      "/cotton-clothing", "/linen-clothing", "/silk-clothing", "/wool-clothing", "/cashmere-clothing", "/natural-fabrics",
    ];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const page of staticPages) {
      xml += `  <url><loc>${baseUrl}${page}</loc><changefreq>weekly</changefreq><priority>${page === "" ? "1.0" : "0.8"}</priority></url>\n`;
    }

    for (const slug of designerSlugs) {
      xml += `  <url><loc>${baseUrl}/designers/${slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
    }

    for (const id of productIds) {
      xml += `  <url><loc>${baseUrl}/product/${id}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
    }

    xml += "</urlset>";

    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    return new NextResponse("Error generating sitemap", { status: 500 });
  }
}
