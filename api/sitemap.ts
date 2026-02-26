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
    { path: "/quiz", priority: "0.7", changefreq: "monthly" },
    { path: "/chat", priority: "0.6", changefreq: "monthly" },
    { path: "/just-in", priority: "0.8", changefreq: "daily" },
    { path: "/about", priority: "0.4", changefreq: "monthly" },
    { path: "/contact", priority: "0.3", changefreq: "monthly" },
    { path: "/privacy", priority: "0.2", changefreq: "yearly" },
    { path: "/terms", priority: "0.2", changefreq: "yearly" },
  ];

  const materialPages = [
    "cashmere", "silk", "wool", "cotton", "linen", "viscose",
    "linen-dresses", "linen-tops", "silk-dresses", "silk-tops",
    "cotton-dresses", "cotton-tops", "cashmere-sweaters",
    "wool-sweaters", "viscose-dresses",
  ].map(slug => ({ path: `/materials/${slug}`, priority: "0.7", changefreq: "weekly" }));

  let brandPages: { path: string; priority: string; changefreq: string }[] = [];
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from("designers")
        .select("slug")
        .order("name");
      if (data) {
        brandPages = data
          .filter((d: any) => d.slug && d.slug.length > 1)
          .map((d: any) => ({ path: `/designers/${d.slug}`, priority: "0.6", changefreq: "weekly" }));
      }
    }
  } catch {}

  const allPages = [...staticPages, ...materialPages, ...brandPages];
  const today = new Date().toISOString().split("T")[0];

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
