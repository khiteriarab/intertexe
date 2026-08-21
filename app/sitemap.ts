import type { MetadataRoute } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isIndexableProduct } from "../lib/seo-policy";
import {
  BRAND_SITEMAP_PAGES,
  PRODUCT_SITEMAP_PAGES,
  SITEMAP_CHUNK,
  sitemapLoc,
  staticIndexablePaths,
} from "../lib/seo-sitemaps";
import { indexableGuides } from "../lib/seo-guides";

function getSupabase(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function sitemapIds(): Array<{ id: string }> {
  const ids = [{ id: "static" }];
  for (let i = 0; i < BRAND_SITEMAP_PAGES; i++) ids.push({ id: `brands-${i}` });
  for (let i = 0; i < PRODUCT_SITEMAP_PAGES; i++) ids.push({ id: `products-${i}` });
  return ids;
}

export async function generateSitemaps() {
  return sitemapIds();
}

export default async function sitemap(props: { id: Promise<string> | string }): Promise<MetadataRoute.Sitemap> {
  const id = typeof props.id === "string" ? props.id : await props.id;

  if (id === "static") {
    const paths = [
      ...staticIndexablePaths(),
      ...indexableGuides().map((g) => `/guides/${g.slug}`),
    ];
    return [...new Set(paths)].map((path) => ({
      url: sitemapLoc(path),
      lastModified: new Date("2026-08-18T00:00:00.000Z"),
    }));
  }

  const supabase = getSupabase();
  if (!supabase) return [];

  if (id.startsWith("brands-")) {
    const page = Number(id.replace("brands-", ""));
    if (!Number.isFinite(page) || page < 0 || page >= BRAND_SITEMAP_PAGES) return [];
    const start = page * SITEMAP_CHUNK;
    const { data } = await supabase
      .from("designers")
      .select("slug")
      .not("slug", "is", null)
      .neq("slug", "")
      .order("name")
      .range(start, start + SITEMAP_CHUNK - 1);
    return (data || [])
      .map((d) => String(d.slug || "").trim())
      .filter(Boolean)
      .map((slug) => ({
        url: sitemapLoc(`/designers/${slug}`),
      }));
  }

  if (id.startsWith("products-")) {
    const page = Number(id.replace("products-", ""));
    if (!Number.isFinite(page) || page < 0 || page >= PRODUCT_SITEMAP_PAGES) return [];
    const start = page * SITEMAP_CHUNK;
    const { data } = await supabase
      .from("products")
      .select("id, title, name, brand_name, image_url, url, composition, natural_fiber_percent")
      .gte("natural_fiber_percent", 80)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("natural_fiber_percent", { ascending: false })
      .range(start, start + SITEMAP_CHUNK - 1);

    return (data || [])
      .filter((row) =>
        isIndexableProduct({
          id: row.id,
          name: row.title || row.name,
          brandName: row.brand_name,
          imageUrl: row.image_url,
          url: row.url,
          composition: row.composition,
          naturalFiberPercent: row.natural_fiber_percent,
        })
      )
      .map((row) => ({
        url: sitemapLoc(`/product/${row.id}`),
      }));
  }

  return [];
}
