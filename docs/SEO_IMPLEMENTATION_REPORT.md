# SEO implementation report

**Date:** 18 August 2026  
**Codebase:** `intertexe-website`  
**This report does not claim that Google will index or rank any URL.**

## Files inspected

- `package.json`, `next.config.js`, `public/robots.txt`
- `app/layout.tsx`, `app/sitemap.ts`, `app/api/sitemap/route.ts`
- Product, shop, search, designers, materials, collections, sale, about, privacy, terms
- `lib/seo-international.ts`, `lib/supabase-server.ts` (`Product`, `fetchProductById`)
- `lib/dashboard/integration-metrics.ts`, Founder HQ `app/dashboard/(app)/page.tsx`
- `lib/job-guard.ts` (`EXPENSIVE_BACKGROUND_JOBS_ENABLED`)
- Footer, leaving hop, affiliate URL helper

## Files changed

**New**

- `lib/seo-policy.ts` — eligibility, robots presets, titles, JSON-LD helpers
- `lib/seo-sitemaps.ts` — allowlisted static paths, chunk caps
- `lib/seo-guides.ts` — editorial/holiday registry
- `app/methodology/page.tsx`
- `app/guides/page.tsx`, `app/guides/[slug]/page.tsx`
- `app/leaving/layout.tsx`, `app/reset-password/layout.tsx`, `app/unsubscribe/layout.tsx`
- `scripts/seo-policy.test.ts`, `scripts/seo-orphan-audit.ts`
- `docs/SEO_AUDIT.md`, `SEO_INDEXATION_POLICY.md`, `SEO_ROUTE_MATRIX.md`, `SEO_HOLIDAY_2026.md`, `SEO_MEASUREMENT.md`, this file

**Updated (selected)**

- `app/sitemap.ts` — sitemap index families, no COUNT(*), no fake priority/changefreq
- `app/api/sitemap/route.ts` — 308 alias to `/sitemap.xml`
- `public/robots.txt` — one sitemap; Disallow private paths; Allow crawl of `/search`
- `next.config.js` — `no-store` only on private routes
- `app/product/[id]/page.tsx` — title pattern, eligibility robots, retailer Offer seller, affiliate disclosure
- `app/shop/page.tsx` — filter/sort URLs `noindex, follow`, canonical `/shop`
- `app/search/page.tsx` — `noindex, follow`; honest zero-result UI
- Designer / material unknown slugs → 404
- HQ This week — Organic search card with GSC labels
- Footer — Guides, Methodology
- `package.json` — `test:seo`

Privacy page Chrome-extension copy from the adjacent launch work is in the same working tree.

## Problems found

1. `/sitemap.xml` and `/api/sitemap` disagreed; the Next sitemap omitted products.
2. Sitemap index ran `COUNT(*)` on designers and products.
3. All public HTML sent `Cache-Control: no-store`.
4. `/search` was indexable.
5. Account, signup, leaving, reset-password, unsubscribe, platform login lacked noindex.
6. Designer and mood pages lacked canonicals; unknown designer/material URLs returned HTTP 200.
7. Product JSON-LD Offer had no seller; easy to read INTERTEXE as the merchant. Material `ItemList` used retailer URLs.
8. Shop filter query strings could be indexed.
9. No central eligibility policy.
10. No methodology / holiday URL framework.
11. GSC “200 / month” could not be verified as clicks vs impressions from code.
12. No `google-site-verification` token in repo (correct — must not be invented).

## Changes completed (P0 + safe P1)

- Central indexation policy
- Bounded sitemap architecture (20×1,000 product URLs max, eligibility filter)
- Crawl rules: Disallow private; noindex search/filters; 404 true unknowns
- Product metadata + affiliate-accurate Product schema
- Search/filter URL control
- Methodology + Guides framework; August 2026 hubs published; later holiday URLs scheduled (404 until review)
- Footer and about internal links (not a keyword footer dump)
- Product disclosure that purchases complete with the retailer
- Bounded related products **unchanged** (existing rails)
- HQ GSC impressions/clicks/CTR/position labeled correctly
- Unit tests for policy and JSON-LD

## Tests run

```
npm run test:seo
```

**Result:** 8 passed, 0 failed (18 August 2026).

```
node --import tsx scripts/seo-orphan-audit.ts
```

**Result:** exit 0. Reports weakly linked *static* paths (e.g. some `/materials/*` combos linked via constructed slugs on the materials hub). Does **not** query the product table.

`npm run test:background-jobs` was not required for this change; expensive jobs remain default off.

**Production `next build`:** not completed in this session (full Vercel compile is environment-heavy). TypeScript `ignoreBuildErrors` is already on in `next.config.js`. A production deploy preview is the right HTML/status/canonical check.

**Lighthouse:** not used as proof of field Core Web Vitals.

## Sample URLs to check after deploy

| URL | Expect |
| --- | --- |
| `https://www.intertexe.com/robots.txt` | Single sitemap line; Disallow dashboard/account/leaving |
| `https://www.intertexe.com/sitemap.xml` | Index of static + brands-* + products-* |
| `https://www.intertexe.com/search` | `noindex` |
| `https://www.intertexe.com/shop?fiber=silk` | canonical `/shop`, `noindex` |
| `https://www.intertexe.com/methodology` | 200, indexable, H1 |
| `https://www.intertexe.com/guides/fall-2026-materials` | 200, Article JSON-LD |
| `https://www.intertexe.com/guides/black-friday-fashion-quality` | 404 until October review |
| A live `/product/{id}` | Product JSON-LD Offer.seller ≠ INTERTEXE; retailer disclosure visible |
| Unknown `/designers/not-a-brand` | 404 |
| `/account` | noindex |

## Remaining risks

- Product URLs are opaque IDs, not slugs.
- Duplicate style IDs (`canonical_id`) not collapsed in sitemaps.
- Product sitemap cap (20k) omits the rest of an eligible catalog **on purpose**.
- `images.unoptimized: true` and Google Fonts remain CWV risks.
- Hreflang on several templates still points every locale at the same URL.
- `/rewards` still lacks an explicit canonical (low priority).
- Designer about still fetches up to 200 products (pre-existing; not raised).
- Field CWV unknown until GSC/CrUX.
- Search still sends queries to GA4; first-party zero-result warehouse not built.
- Polyester / nylon / alpaca / handbags / shoes hubs were **not** auto-published (catalog is 80%+ natural apparel; those pages would be thin or misleading).

## Search Console actions Khiteri must complete manually

1. Record impressions, CTR, and average position alongside the verified **200 clicks / 28 days** baseline (email 14 August 2026). Do not mix that with GA4 sessions.
2. Verify the `www.intertexe.com` property (real token or DNS — do not paste a guessed meta tag).
3. Submit **only** `https://www.intertexe.com/sitemap.xml`.
4. After deploy, inspect Coverage for leftover `/search` and `/shop?` URLs; they should drop as `noindex` is crawled.
5. Connect GSC to HQ if Acquisition/This week cards say not connected.
6. Request indexing for `/methodology` and the six August `/guides/*` URLs only.

## Recommended next 10 pages (search + revenue value)

Already live or published in this pass — maintain rather than duplicate:

1. `/guides/wool-coats-fall-winter`
2. `/materials/wool-coats`
3. `/guides/cashmere-sweaters-worth-the-price`
4. `/materials/cashmere-sweaters`
5. `/materials/silk-dresses`
6. `/silk-clothing`
7. `/guides/evaluate-coat-composition`
8. `/methodology`
9. `/materials/linen-dresses`
10. `/collections/evening` (holiday dress demand without a new filter URL)

After 15 September, publish the scheduled holiday-party and fabric-explainers **only after inventory review**.

## Intentionally not implemented (and why)

| Item | Why |
| --- | --- |
| Index every product row | Forbidden; bounded 20k sitemap + eligibility |
| Programmatic polyester/nylon/alpaca/handbag/shoe hubs | Would be thin or contradict the 80% natural apparel catalog; needs editorial proof of inventory |
| Product URL slug migration | Ranking-risk rewrite, not P0 |
| 410 automation | Too easy to kill URLs with remaining value |
| next/image + AVIF for all CDNs | `unoptimized: true` exists because remote hosts are incomplete in `remotePatterns` |
| llms.txt / IndexNow | Speculative; fundamentals first |
| Nightly catalog SEO cron | Violates EXPENSIVE job policy |
| Live GSC API expansion | UI exists; credentials must be connected manually |
| Local Lighthouse as CWV proof | Field data only |
| CMS | Existing `PAGE_CONFIGS` + `GUIDE_PAGES` registry is enough |
| Invented GTIN/reviews/shipping | Affiliate accuracy |

## Affiliate / attribution

- Shop Now and `/leaving` behavior unchanged.
- Offer URL remains the retailer destination.
- Internal links do not append `u1` or UTM.
- App download click logging on `/download` and `/open` unchanged.
