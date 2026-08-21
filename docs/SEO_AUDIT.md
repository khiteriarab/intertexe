# INTERTEXE technical SEO audit

**Date:** 18 August 2026  
**Codebase:** `intertexe-website` (Next.js App Router on Vercel, Supabase as catalog source of truth)  
**Scope:** Phase 0 inspection plus the P0/P1 fixes shipped in the same change set.  
**This document does not claim ranking or indexing.**

## Verifying the “200” number

Google Search Console email dated **14 August 2026**: the site reached **200 clicks** from Google Search in the **past 28 days**. That is **clicks**, not impressions, users, or pageviews, and it is a 28-day window rather than a calendar month (~7 clicks/day).

Those metrics are **not interchangeable**:

| Metric | Meaning |
| --- | --- |
| Impressions | How often a link to INTERTEXE appeared in Google Search results |
| Clicks | How often someone clicked that link (**this is the 200**) |
| CTR | Clicks ÷ impressions (not in the email) |
| Average position | Mean ranking of those impressions (not in the email) |
| Users / sessions / pageviews | GA4 / first-party analytics — **not** Search Console |

## 1. Framework and version

- Next.js `^15.5.12` (App Router)
- React `^19.2.0`
- Host: Vercel
- Catalog: Supabase (`@supabase/supabase-js`)
- No `next-seo` package; metadata uses the App Router `Metadata` API

## 2. App Router versus Pages Router

App Router only. There is no `pages/` directory. Public HTML lives under `app/**/page.tsx`.

## 3–4. Public route types and rendering

See `docs/SEO_ROUTE_MATRIX.md` for the route-level table. Summary:

- **SSR / `force-dynamic`:** homepage, shop, sale, search, materials, collections, many editorial landings
- **SSR with `revalidate`:** designers (`300`), moods (`300`), search also sets `revalidate = 60` while remaining dynamic
- **Product pages:** `revalidate = 0`, `generateStaticParams() = []` (on-demand)
- **Client-only shells:** quiz, chat, leaving, reset-password, unsubscribe, some account UI
- **Private:** `/dashboard/*` (layout `noindex, nofollow`), `/account`, `/inspirations/[id]`

## 5. Metadata

- Root `app/layout.tsx`: default title template `%s | INTERTEXE`, `metadataBase`, Open Graph, Twitter, `GLOBAL_ROBOTS`
- Dynamic `generateMetadata` on product, designer, material, collection, mood, shop (now), guides
- Static `export const metadata` on legal, about, search, fabric landings

**Problems found (pre-fix):** missing canonicals on designer/mood hubs; search indexable; private pages missing `noindex`; product titles did not follow a consistent material-first pattern.

## 6. Canonical tags

Canonicals are absolute `https://www.intertexe.com/...` via `metadataBase` and `pageAlternates()` in `lib/seo-international.ts`.

Shop filter URLs now **canonicalise to `/shop` and send `noindex, follow`**. Tracking parameters are not part of INTERTEXE public URLs (UTM is stored in cookies; Rakuten `u1` is outbound only).

## 7. robots.txt

`public/robots.txt` now:

- Allows crawl of public content
- Disallows private/transactional paths (`/dashboard`, `/account`, `/leaving`, `/api/` except `/api/sitemap`)
- Lists **one** sitemap: `https://www.intertexe.com/sitemap.xml`

Search remains crawlable so Google can see the `noindex` directive.

## 8. Sitemaps

**Before:** two competing sitemaps. `/sitemap.xml` listed a handful of static URLs with fake `changefreq`/`priority`. `/api/sitemap` listed products/designers but ran `COUNT(*)` on designers and products on every index request.

**After:** Next.js `generateSitemaps()` in `app/sitemap.ts`:

- `/sitemap.xml` is the index
- `static`, `brands-0..1`, `products-0..19` chunks of 1,000
- **No** `changefreq` or `priority`
- Product URLs included only if they pass `isIndexableProduct()`
- Product coverage is **capped at 20,000 URLs** so the job cannot walk the full catalog
- Legacy `/api/sitemap` 308s to the new files

## 9. Structured data

Site-wide: `Organization` + `WebSite` in root layout. SearchAction now points at `/search?q=` (noindex search page).

Product: `Product` + `Offer`. Offer URL is the **retailer destination**. Seller is `"Retail partner"`, not INTERTEXE. INTERTEXE page URL is `Product.url`.

Materials: `BreadcrumbList` + `ItemList` with INTERTEXE product URLs (previously leaked retailer URLs into the list).

Guides: `Article` with `datePublished` / `dateModified` from editorial review dates, not render time.

No review/rating markup. No INTERTEXE shipping or return policy markup.

## 10. Product, brand, material, search, app-download routes

Covered in the route matrix. App download click tracking remains on `/download` (redirect) and `/open` (noindex). Do not sitemap `/download`.

## 11. Query parameters

Shop: `market`, `fiber`, `category`, `sort`, `q`, `color`, `fiberSubtype`, `materialSubtype`, `fabricConstruction`, `price`, `brands`.

All of the above are non-indexable (`lib/seo-policy.ts` `NON_INDEXABLE_QUERY_KEYS`).

Affiliate `u1` is appended only to outbound retailer/affiliate URLs.

## 12. Product URL stability and duplicates

Pattern: `/product/[id]` (UUID or numeric `product_id`). `canonical_id` exists in the catalog for style dedupe but is **not** used as a public URL. Changing to slugs would be a migration, not a Phase 1 rewrite. Duplicate retailer SKUs of the same style remain a residual risk.

## 13. Internal linking and orphans

Footer, material hubs, product breadcrumbs (Home / Shop / Brand / Product), related rails, and new Guides/Methodology links.

A bounded orphan script (`scripts/seo-orphan-audit.ts`) checks **static** routes only. It does not scan the product table. Many `/materials/*` subcategory URLs are linked from the materials hub via constructed slugs rather than raw `href` strings; that is expected.

## 14. 404 / 410 / discontinued

- Missing product → `notFound()` (404)
- Missing designer/material/guide → 404 (previously some 200 “not found” HTML)
- **No sitewide 410**
- Unavailable products still render when composition and alternatives exist; they are not redirected to the homepage
- Dead products with no useful page still 404 via `fetchProductById` returning null (including `<80%` natural fiber)

## 15. Images

`next.config.js` has `images.unoptimized: true` because product imagery comes from many retailer CDNs. Enabling Next image optimization without a complete `remotePatterns` list would break a large share of cards. Product LCP uses a crawlable `<img>` with `fetchPriority="high"` and 3:4 width/height attributes. This is a Core Web Vitals risk, not flipped in this pass.

## 16. Core Web Vitals risks (not Lighthouse-as-proof)

- Global `Cache-Control: no-store` on **all** HTML (fixed: private routes only)
- Unoptimized remote images
- `force-dynamic` on many hubs
- Google Fonts loaded from fonts.googleapis.com in root layout (CLS/font risk)
- Product `revalidate = 0` keeps prices fresh at the cost of TTFB

No claim that local Lighthouse equals field CWV.

## 17. Analytics and Search Console

- GA4 `G-EVKFJLK9BP` via `app/components/Analytics.tsx`
- Vercel Analytics + Speed Insights
- UTM / gclid stored first-touch in cookies
- **No `google-site-verification` meta in the repo** (must be added from the live GSC token, never invented)
- HQ already ingested GSC clicks/impressions when connected (`lib/dashboard/integration-metrics.ts`). This week now surfaces them with correct labels. Settings still shows Search Console as `not_connected` until credentials exist.

## 18. Large catalog queries

Sitemap product/brand chunks use `.range()` of 1,000 rows and a **fixed page cap**. The previous sitemap index `COUNT(*)` was removed.

`EXPENSIVE_BACKGROUND_JOBS_ENABLED` remains default **off**. No nightly full-catalog SEO job was added.

## P0 issues addressed in this change set

1. Dual/incomplete sitemaps
2. Global no-store HTML cache
3. Search indexable
4. Missing `noindex` on private/transactional pages
5. Missing designer/mood canonicals
6. Soft-200 not-found pages
7. Product schema implying INTERTEXE might be the merchant
8. Material ItemList pointing at retailer URLs
9. Shop filter URLs eligible for indexation
10. Sitemap `COUNT(*)` on large tables

## Route-level table

Full columns live in `docs/SEO_ROUTE_MATRIX.md`. Condensed view after this change set:

| Route pattern | Purpose | Indexability | Canonical | Action taken |
| --- | --- | --- | --- | --- |
| `/` | Homepage | Index | Self | Keep |
| `/product/[id]` | Product PDP | Index only if `isIndexableProduct` | `/product/{id}` | Policy + schema + disclosure |
| `/shop` | Catalog | Index clean URL only | `/shop` | Filter/sort/q → noindex, follow |
| `/shop?*` | Filters/sort/search | noindex, follow | `/shop` | Do not sitemap |
| `/search` | On-site search | noindex, follow | `/search` | Keep crawlable for noindex |
| `/designers` | Brand directory | Index | `/designers` | Canonical added |
| `/designers/[slug]` | Brand shop | Index if brand exists | `/designers/{slug}` | 404 if missing |
| `/designers/[slug]/about` | Brand review | Index if brand exists | Self | 404 if missing |
| `/materials` | Fabric hub | Index | Self | Keep |
| `/materials/[fiber]` | Fiber hub | Index allowlisted fibers | Self | 404 unknown slugs |
| `/materials/[fiber-category]` | Curated combo | Index allowlisted only | Self | No arbitrary combos |
| `/silk-clothing` etc. | Fiber landings | Index | Self | Keep |
| `/collections/[slug]` | Editorial collections | Index known slugs | Self | Keep |
| `/guides`, `/guides/[slug]` | Editorial/holiday | Index only `status: indexable` | Self | Framework added |
| `/methodology`, `/about` | Trust / AI discovery | Index | Self | Methodology added |
| `/sale` | Sale catalog | Index | `/sale` | Keep |
| `/quiz` | Style quiz | Index | Self | Unique tool page |
| `/scanner` | App download / scan CTA | Index | Self | Keep |
| `/chat` | Advisor UI | noindex, follow | Self | Thin client |
| `/account`, `/signup` | Auth | noindex, nofollow | Self | robots + Disallow |
| `/dashboard/*` | Founder HQ | noindex, nofollow | n/a | Disallow |
| `/leaving` | Affiliate hop | noindex, nofollow | n/a | Disallow |
| `/inspirations/[id]` | Private capture | noindex, nofollow | n/a | Disallow |
| `/download` | App Store redirect | Do not index | n/a | Not in sitemap |
| `/open` | App open | noindex | n/a | Disallow |

Unknown material/designer/product URLs now return **404**, not 200 HTML. **410 is unused.**

