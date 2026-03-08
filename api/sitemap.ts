import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const CURATED_BRAND_SLUGS = new Set([
  "the-row", "brunello-cucinelli", "loro-piana", "margaret-howell", "lemaire",
  "jil-sander", "toteme", "eileen-fisher", "joseph", "khaite", "loewe",
  "bottega-veneta", "chloe", "stella-mccartney", "acne-studios", "isabel-marant",
  "vince", "cos", "filippa-k", "arket", "nili-lotan", "rag-bone",
  "theory", "frame", "agolde", "sandro", "maje", "reformation",
  "anine-bing", "nanushka", "the-kooples", "ba-sh", "sezane", "ganni",
  "a-p-c", "ami", "jacquemus", "zimmermann", "ulla-johnson",
  "st-agni", "loulou-studio", "by-malene-birger", "esse-studios",
  "everlane", "quince", "massimo-dutti", "reiss", "club-monaco",
  "allsaints", "ted-baker", "j-crew", "banana-republic",
  "diesel", "l-agence", "tibi", "rachel-comey", "rixo", "re-done",
  "sea-new-york", "a-l-c-",
  "dries-van-noten", "rick-owens", "maison-margiela", "sacai", "marni",
  "max-mara", "weekend-max-mara", "sportmax", "staud", "tory-burch",
  "veronica-beard", "alice-olivia", "equipment", "joie", "rails",
  "velvet-by-graham-spencer", "james-perse", "citizens-of-humanity",
]);

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const baseUrl = "https://www.intertexe.com";

  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/shop", priority: "0.9", changefreq: "daily" },
    { path: "/designers", priority: "0.9", changefreq: "weekly" },
    { path: "/designers/all", priority: "0.8", changefreq: "weekly" },
    { path: "/materials", priority: "0.8", changefreq: "weekly" },
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
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: brandsWithProducts } = await supabase
        .from("products")
        .select("brand_slug")
        .not("brand_slug", "is", null);
      const productSlugs = new Set(
        (brandsWithProducts || []).map((p: any) => p.brand_slug).filter(Boolean)
      );

      const allSlugs = new Set([...productSlugs, ...CURATED_BRAND_SLUGS]);
      brandPages = [...allSlugs]
        .sort()
        .map(slug => ({ path: `/designers/${slug}`, priority: "0.6", changefreq: "weekly" }));
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
