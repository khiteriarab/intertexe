import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
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

  const brandSlugs = (matchedDesigners || []).map((d: any) => d.slug);
  console.log(`Verified brand slugs (exist in both products AND designers): ${brandSlugs.length}`);
  brandSlugs.forEach((s: string) => console.log(`  ${s}`));

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
  console.log(`\nApproved products: ${productIds.length}`);

  const baseUrl = "https://www.intertexe.com";
  const today = new Date().toISOString().split("T")[0];

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
  ].map(s => ({ path: "/materials/" + s, priority: "0.7", changefreq: "weekly" }));

  const brandPageEntries = brandSlugs.map((s: string) => ({ path: "/designers/" + s, priority: "0.6", changefreq: "weekly" }));
  const productPageEntries = productIds.map((id: string) => ({ path: "/product/" + id, priority: "0.5", changefreq: "weekly" }));

  const allPages = [...staticPages, ...materialPages, ...brandPageEntries, ...productPageEntries];

  const lines = allPages.map((p: any) =>
    "  <url>\n    <loc>" + baseUrl + p.path + "</loc>\n    <lastmod>" + today + "</lastmod>\n    <changefreq>" + p.changefreq + "</changefreq>\n    <priority>" + p.priority + "</priority>\n  </url>"
  );
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + lines.join("\n") + "\n</urlset>";

  const fs = await import("fs");
  fs.writeFileSync("/home/runner/workspace/client/public/sitemap.xml", xml);
  console.log(`\nSitemap written: ${allPages.length} URLs (${staticPages.length} static + ${materialPages.length} materials + ${brandPageEntries.length} brands + ${productPageEntries.length} products)`);
}
main().catch(console.error);
