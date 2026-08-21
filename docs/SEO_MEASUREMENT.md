# SEO measurement and Founder HQ

**Date:** 18 August 2026  
**Do not call Search Console impressions “views.” Do not treat traffic as revenue.**

## Verified Search Console baseline (14 August 2026)

Google Search Console emailed property owners on **14 August 2026**:

> Your site reached **200 clicks** from Google Search in the **past 28 days**.

That is **clicks**, not impressions, users, or pageviews.

| What the email is | What it is not |
| --- | --- |
| Search Console **clicks** | Search Console **impressions** |
| Last **28 days** (not a calendar month) | GA4 users, sessions, or pageviews |
| Roughly **7 clicks / day** | Revenue, retailer clicks, or app downloads |

Impressions, CTR, and average position were not in that email. Record those separately in Search Console. Founder HQ must keep impressions and clicks on different lines.

Treat **200 clicks / 28 days** as the organic-click baseline before the August 2026 technical SEO deploy. Do not compare it to HQ “This week” retailer clicks or affiliate commission.

## Organic path (keep stages separate)

1. Google Search **impression**
2. Google Search **click**
3. Organic **landing session** (GA4 session with first source/medium `google / organic`, or equivalent)
4. Organic **product view**
5. **Account creation**
6. **Activation** (first scan in current HQ definition)
7. **Save** / favorite
8. **Retailer click**
9. **Affiliate revenue** (Rakuten commission — delayed, not a session metric)

Never add these numbers together. Never label commission as “from SEO” unless the click has a first-touch organic source in first-party attribution.

## What HQ shows now

`app/dashboard/(app)/page.tsx` — card **Organic search**:

- Search Console impressions (7d)
- Search Console clicks (7d)
- Organic CTR (7d)
- Average position (7d)

Copy on the card states that impressions are not pageviews.

Fuller GSC query/page tables already exist on **Acquisition** (`gscTopQueries`, `gscTopPages`, `gscQueryChanges`) via `fetchGoogleDiscoveryMetrics`.

Company funnel on This week remains **app-download click → Apple units → accounts → activated → retailer clicks → commission**. That funnel is **not** the organic path. Do not merge them.

## Not yet wired (no expensive real-time GSC crawl)

These diagnostics need Search Console API data that is only present when the integration is connected. Until then, show “Not connected” rather than zeros that look like truth:

- Indexed / submitted / excluded page counts
- Pages with impressions but poor CTR
- Queries in positions 4–20
- Organic landing sessions vs GSC clicks
- Organic-only product views, saves, retailer clicks, revenue
- Internal search zero-result count (first-party)

## Manual Search Console connection (Khiteri)

1. Search Console → add `https://www.intertexe.com/` if missing (URL-prefix or Domain property).
2. Verification: use the HTML tag **or** DNS record. If using a meta tag, put the real token in root metadata `verification.google`. **Do not invent a token. Do not commit secrets.**
3. Submit sitemap: `https://www.intertexe.com/sitemap.xml` (only this index).
4. If HQ GSC cards stay empty, connect the existing Google integration used by `lib/dashboard/integration-metrics.ts` (workspace settings). Credentials stay in env / Secret Manager.
5. Request indexing only for the new `/guides/*` and `/methodology` URLs after production deploy — not for `/search` or `/shop?...`.

Settings still lists Search Console as `not_connected` until that integration is live.

## On-site search analytics (first-party)

Today `SearchResultsBeacon` sends query + result count to GA4/Meta. Clothing search terms are not treated as passwords, but they can still be sensitive.

P2 (not in this change): write `{ query, result_count, is_zero }` to an existing HQ events table **without email**, bounded, kill-switch aware. Do not add a catalog-wide search log job.

Empty search UI now explains that the query was not rewritten and points to Fabrics / Designers / Guides.

## Performance measurement (field, not local Lighthouse)

Targets at the 75th percentile: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.

Instrument via Vercel Speed Insights (already on) and CrUX / Search Console Core Web Vitals once the property is verified.

Known risks (not claimed fixed):

- `images.unoptimized: true` (many retailer CDNs)
- Google Fonts CSS in `app/layout.tsx`
- Product pages `revalidate = 0` (price freshness over TTFB)
- Shop/materials `force-dynamic`

Public HTML is no longer globally `no-store`. Private routes still are. **Price accuracy:** product HTML can be cached by the browser/CDN only as far as Next/Vercel defaults for `revalidate = 0` (uncached SSR). That is the documented tradeoff.

## Safe automation (no full-catalog nightly job)

| Job | Status | Load |
| --- | --- | --- |
| Sitemap chunks | On request, 1,000-row range, 20 product pages max | Bounded |
| Orphan audit | `scripts/seo-orphan-audit.ts` static files only | No DB |
| SEO unit tests | `npm run test:seo` | No DB |
| Catalog snapshot / classify / full feed scan | Still behind `EXPENSIVE_BACKGROUND_JOBS_ENABLED` default off | Do not enable for SEO |

Weekly SEO report: use HQ GSC cards + Acquisition tables. Do not add a new cron that pages through `products`.
