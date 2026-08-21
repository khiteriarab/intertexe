# INTERTEXE indexation policy

**Owner:** INTERTEXE editorial + engineering  
**Code:** `lib/seo-policy.ts`  
**Date:** 18 August 2026  

This is the single policy for what Google may index. UI components should import these helpers instead of inventing local robots logic.

INTERTEXE is a **fashion discovery and material-intelligence platform**, not the merchant of record. Indexable pages must still be useful to a shopper. They must not invent facts.

## Product eligibility (minimum)

A product URL may be indexable, and may appear in XML sitemaps, only when all of the following are true:

1. Stable canonical URL (`https://www.intertexe.com/product/{id}`)
2. Valid product name
3. Brand name
4. Usable primary image (`http(s)` URL)
5. Valid retailer destination (absolute URL whose host is not intertexe.com)
6. Meaningful composition text
7. Natural-fiber percent ≥ 80 when a percent exists (matches current catalog gate)
8. Enough on-page content to answer a composition/price question (PDP already renders fabric details, price, brand, retailer CTA, alternatives when available)

`fetchProductById` already returns null for men’s rows, consumer exclusions, and `<80%` fiber. Those URLs 404.

## Behaviours A–M

### A. Indexable product pages

Render normally. `index, follow`. Include in the **bounded** product sitemap only if they pass `isIndexableProduct()`. JSON-LD `Product` + retailer `Offer` (seller = retail partner). INTERTEXE is never marked as the merchant. No shipping/return schema. No invented reviews.

### B. Non-indexable product pages

If the PDP still renders but fails eligibility (missing composition, image, or retailer URL): keep the page for users, send **`noindex, follow`**, exclude from sitemaps. Do not redirect to `/shop`.

### C. Discontinued products with continued search value

If the product still has composition, image, and relevant alternatives, keep the URL. Show stock copy from `stockDetailLine`. Do **not** mass-redirect to a category or homepage. Remain indexable only while eligibility still holds.

### D. Dead products with no useful replacement

`fetchProductById` → null → **404**. Do not use 410 unless editorial confirms the URL is permanently gone and has no successor. 410 is not automated.

### E. Duplicate retailer listings of the same product

Catalog has `canonical_id` / `offerKey` for style dedupe in browsing. Public URLs remain `/product/{id}`. Phase 1 does **not** rewrite IDs to slugs or collapse duplicates in the sitemap beyond eligibility. Residual duplicate-URL risk is documented; a later pass may canonicalise to a chosen ID without a full-catalog job.

### F. Empty categories

Unknown `/materials/{slug}` now **404**. Empty curated hubs that still have unique editorial copy may render; they should not be expanded into arbitrary filter URLs. Do not index `?category=` shop variants.

### G. Thin brands

Unknown designer slug → **404**. Brands with zero live pieces still render the designer page (user-facing empty state) but should not be treated as a growth strategy. Directory listing already prefers brands with inventory. Do not generate brand×fiber filter URLs.

### H. Search results

`/search` and `/search?q=` are **`noindex, follow`**. Crawl is allowed so Google can see noindex. Not in sitemaps. Empty results do not rewrite the query.

### I. Filtered results

`/shop?fiber=`, `category=`, `color=`, `price=`, `brands=`, subtypes, etc. Canonical **`/shop`**. Robots **`noindex, follow`**. Valuable combinations get **curated** `/materials/{fiber-category}` or `/guides/{slug}` pages instead.

### J. Sorted results

`/shop?sort=` is non-indexable. Same canonical `/shop`.

### K. Pagination

Shop pagination is client-side / offset in API, not public `/shop?page=N` landing pages. `page` and `offset` are in the non-indexable query list. Do not sitemap paginated shop URLs.

### L. Tracking parameters

UTM, gclid, fbclid, ttclid, msclkid, u1 on INTERTEXE URLs: non-indexable; canonicalise to the clean path. Outbound Rakuten `u1` is **not** an INTERTEXE query param and must not be copied onto internal links.

### M. Authentication and private-user pages

`noindex, nofollow` **and** `robots.txt` Disallow: `/dashboard`, `/account`, `/signup`, `/leaving`, `/reset-password`, `/unsubscribe`, `/extension/`, `/inspirations/`, `/open`, `/khiteri`. Google does not need to crawl these to see noindex.

## Allowlist Google may index

- `/`
- `/shop` (no query string)
- `/sale`
- `/product/{id}` when eligible
- `/designers`, `/designers/all`, `/designers/{slug}`, `/designers/{slug}/about` when the brand exists
- `/materials` and **allowlisted** fiber / fiber-category slugs
- Standalone `/silk-clothing`, `/linen-clothing`, `/cotton-clothing`, `/wool-clothing`, `/cashmere-clothing`, `/natural-fabrics`
- `/collections` and known collection slugs
- `/guides` and guides with `status: indexable` whose `publishAfter` has passed
- `/about`, `/methodology`, `/contact`, `/press`, `/partners`, `/privacy`, `/terms`
- `/quiz`, `/scanner`

Everything else is noindex, 404, or Disallow as above.

## What we will not do

- Index every database row
- Publish thin AI pages for every material×category×brand tuple
- Index internal search
- Add llms.txt / IndexNow in this phase
- Run nightly full-catalog SEO jobs
- Claim that this policy guarantees rankings
