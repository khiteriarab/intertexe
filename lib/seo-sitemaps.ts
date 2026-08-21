import { COLLECTION_SLUGS } from "./collection-pages";
import { SITE_URL } from "./seo-international";

/** Bounded sitemap architecture — no full-catalog COUNT(*) and no changefreq/priority. */

export const SITEMAP_CHUNK = 1000;
/** Cap product sitemap URLs so a request never walks the whole catalog. */
export const PRODUCT_SITEMAP_PAGES = 20;
export const BRAND_SITEMAP_PAGES = 2;

export const CURATED_MATERIAL_SLUGS = [
  "silk",
  "cotton",
  "linen",
  "wool",
  "cashmere",
  "leather",
] as const;

export const CURATED_MATERIAL_CATEGORY_SLUGS = [
  "linen-dresses",
  "linen-tops",
  "linen-pants",
  "linen-shirts",
  "linen-sets",
  "silk-dresses",
  "silk-tops",
  "silk-blouses",
  "silk-skirts",
  "silk-dresses-evening",
  "cotton-dresses",
  "cotton-tops",
  "cotton-shirts",
  "cotton-t-shirts",
  "cotton-pants",
  "cotton-denim",
  "cotton-knitwear",
  "cashmere-sweaters",
  "cashmere-knits",
  "wool-sweaters",
  "wool-coats",
  "wool-pants",
  "viscose-dresses",
] as const;

export const STANDALONE_FABRIC_PAGES = [
  "/silk-clothing",
  "/linen-clothing",
  "/cotton-clothing",
  "/wool-clothing",
  "/cashmere-clothing",
  "/natural-fabrics",
] as const;

export function staticIndexablePaths(): string[] {
  const paths = [
    "/",
    "/shop",
    "/sale",
    "/designers",
    "/designers/all",
    "/materials",
    "/collections",
    "/about",
    "/contact",
    "/press",
    "/partners",
    "/scanner",
    "/quiz",
    "/privacy",
    "/terms",
    "/methodology",
    "/guides",
    ...STANDALONE_FABRIC_PAGES,
    ...CURATED_MATERIAL_SLUGS.map((slug) => `/materials/${slug}`),
    ...CURATED_MATERIAL_CATEGORY_SLUGS.map((slug) => `/materials/${slug}`),
    ...COLLECTION_SLUGS.map((slug) => `/collections/${slug}`),
  ];
  return [...new Set(paths)];
}

export function sitemapLoc(path: string): string {
  if (path === "/") return SITE_URL;
  return `${SITE_URL}${path}`;
}
