import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const baseUrl = "https://www.intertexe.com";

  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/shop", priority: "0.9", changefreq: "daily" },
    { path: "/designers", priority: "0.9", changefreq: "weekly" },
    { path: "/designers/all", priority: "0.8", changefreq: "weekly" },
    { path: "/materials", priority: "0.8", changefreq: "weekly" },
    { path: "/natural-fabrics", priority: "0.8", changefreq: "weekly" },
    { path: "/cotton-clothing", priority: "0.8", changefreq: "weekly" },
    { path: "/linen-clothing", priority: "0.8", changefreq: "weekly" },
    { path: "/silk-clothing", priority: "0.8", changefreq: "weekly" },
    { path: "/wool-clothing", priority: "0.8", changefreq: "weekly" },
    { path: "/cashmere-clothing", priority: "0.8", changefreq: "weekly" },
    { path: "/scanner", priority: "0.7", changefreq: "monthly" },
    { path: "/quiz", priority: "0.7", changefreq: "monthly" },
    { path: "/chat", priority: "0.6", changefreq: "monthly" },
    { path: "/just-in", priority: "0.8", changefreq: "daily" },
    { path: "/about", priority: "0.4", changefreq: "monthly" },
    { path: "/contact", priority: "0.3", changefreq: "monthly" },
    { path: "/privacy", priority: "0.2", changefreq: "yearly" },
    { path: "/terms", priority: "0.2", changefreq: "yearly" },
  ];

  const materialPages = [
    "cotton", "linen", "silk", "wool", "cashmere",
    "cotton-dresses", "cotton-shirts", "cotton-tops", "cotton-pants", "cotton-knitwear",
    "linen-dresses", "linen-tops", "linen-shirts", "linen-pants", "linen-sets",
    "silk-dresses", "silk-tops", "silk-blouses", "silk-skirts", "silk-dresses-evening",
    "wool-sweaters", "wool-coats", "wool-pants",
    "cashmere-sweaters", "cashmere-knits",
    "viscose-dresses",
  ].map(slug => ({ path: `/materials/${slug}`, priority: "0.7", changefreq: "weekly" }));

  let brandPages: { path: string; priority: string; changefreq: string }[] = [];
  let productPages: { path: string; priority: string; changefreq: string }[] = [];

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: productBrands } = await supabase
        .from("products")
        .select("brand_slug")
        .not("brand_slug", "is", null);
      const productBrandSlugs = [...new Set(
        (productBrands || []).map((p: any) => p.brand_slug).filter(Boolean)
      )];

      const { data: matchedDesigners } = await supabase
        .from("designers")
        .select("slug")
        .in("slug", productBrandSlugs)
        .order("slug");

      if (matchedDesigners) {
        brandPages = matchedDesigners.map((d: any) => ({
          path: `/designers/${d.slug}`,
          priority: "0.6",
          changefreq: "weekly",
        }));
      }

      const productIds: string[] = [];
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const { data: batch } = await supabase
          .from("products")
          .select("id")
          .eq("approved", "yes")
          .range(offset, offset + batchSize - 1);
        if (!batch || batch.length === 0) break;
        productIds.push(...batch.map((p: any) => p.id));
        offset += batchSize;
        if (batch.length < batchSize) break;
      }

      productPages = productIds.map(id => ({
        path: `/product/${id}`,
        priority: "0.5",
        changefreq: "weekly",
      }));
    }
  } catch {}

  const allPages = [...staticPages, ...materialPages, ...brandPages, ...productPages];
  const today = new Date().toISOString().split("T")[0];

  if (allPages.length > 50000) {
    const chunkSize = 45000;
    const chunks: typeof allPages[] = [];
    for (let i = 0; i < allPages.length; i += chunkSize) {
      chunks.push(allPages.slice(i, i + chunkSize));
    }

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${chunks.map((_, i) => `  <sitemap>
    <loc>${baseUrl}/api/sitemap?page=${i + 1}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`).join("\n")}
</sitemapindex>`;

    const pageParam = _req.query?.page;
    if (pageParam) {
      const pageNum = parseInt(pageParam as string, 10) - 1;
      const chunk = chunks[pageNum] || [];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${chunk.map(p => `  <url>
    <loc>${baseUrl}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
      return res.status(200).send(xml);
    }

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    return res.status(200).send(sitemapIndex);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${baseUrl}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.status(200).send(xml);
}
