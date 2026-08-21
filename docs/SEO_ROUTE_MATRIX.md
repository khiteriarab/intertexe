# INTERTEXE SEO route matrix

**Date:** 18 August 2026  
**Companion:** `docs/SEO_AUDIT.md`, `docs/SEO_INDEXATION_POLICY.md`

Rendering legend: **SSR** = App Router server component; **FD** = `force-dynamic`; **ISR** = timed `revalidate`; **CO** = client-only page/shell.

| Route pattern | Purpose | Current indexability | Recommended | Canonical | Metadata | Schema | Internal links | Data-quality risk | Performance risk | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Discovery homepage | Index | Index | Self | Root + home generateMetadata | Organization, WebSite | Footer, nav | Stats fallback can stale | FD, hero images | Keep SSR; do not no-store |
| `/product/[id]` | Material PDP + retailer CTA | Conditional | Index iff eligible | `/product/{id}` | Dynamic title/description/OG | Product + Offer (retailer seller) + BreadcrumbList | Brand, fiber guide, related rails | Missing composition/image/url | `revalidate=0`, remote img | Policy gate; noindex if thin |
| `/shop` | Catalog browse | Index | Index clean URL | `/shop` | generateMetadata | None required | Nav, footer | Filter state is client | FD + catalog query | Keep |
| `/shop?...` | Filters, sort, q, price, brand | Was indexable | **noindex, follow** | `/shop` | Same title, noindex | None | Should not be linked with tracking | URL explosion | Same | Implemented |
| `/sale` | Sale browse | Index | Index | `/sale` | Static | None | Footer | Sale mix quality | FD | Keep; do not index `?` variants |
| `/search` | On-site findability | Was index | **noindex, follow** | `/search` | Static + noindex | None | Header | Thin / query URLs | FD + ilike | Implemented; better empty state |
| `/designers` | Brand directory | Index | Index | `/designers` | Dynamic counts | None | Footer | Cached brand stats | FD | Canonical added |
| `/designers/all` | A–Z | Index | Index | Self | Inherited | None | Weak | Large list | FD | Keep; add hub link later |
| `/designers/[slug]` | Brand shop | Index | Index if exists | Self | Title pattern + canonical | None (P2 Brand schema) | Product → brand | Thin brands | `revalidate=300`, 48-item cap | 404 if unknown |
| `/designers/[slug]/about` | Quality review | Index | Index if exists | Self | Canonical added | None | Link from brand shop | Profile fallback copy | Fetches up to 200 products | 404 if unknown; do not raise limit |
| `/materials` | Fabric hub | Index | Index | Self | Dynamic | None | Footer, subcats | — | FD + counts | Keep |
| `/materials/{silk,cotton,linen,wool,cashmere,leather}` | Fiber hubs | Index | Index | Self | SEO_CONTENT | BreadcrumbList, ItemList | Subcats, products | ItemList previously used retailer URLs | FD + bounded product fetch | ItemList → INTERTEXE URLs |
| `/materials/{curated-combo}` | High-intent combos | Index allowlist | Index allowlist only | Self | PAGE_CONFIGS | BreadcrumbList, ItemList | Fiber parent | Unique editorial required | FD | Unknown slug 404 |
| `/silk-clothing` `/linen-clothing` `/cotton-clothing` `/wool-clothing` `/cashmere-clothing` | Alternate fiber landings | Index | Index | Self | Static | None | Materials subcats | Overlap with `/materials/{fiber}` | `fetchProductCount` | Keep both; internally link; do not add more duplicates |
| `/natural-fabrics` | Fabric explainer | Index | Index | Self | Static | None | Fiber pages | — | Low | Keep |
| `/collections` | Collection hub | Index | Index | Self | Static | None | Weak vs footer | — | CO client | Link from Guides |
| `/collections/[slug]` | Vacation, evening, tailoring, etc. | Index known | Index known | Self | Dynamic | None | Home rails | Editorial must stay unique | FD | 404 unknown |
| `/edits/[slug]` | Fabric edits | Index / redirect | Canonical to collection or materials | Config path | Dynamic | None | — | Duplicate of collections | FD | Existing redirects preserved |
| `/moods/[slug]` | Mood merchandising | Index | Index known | Self | Canonical added | None | Mood chips | Thin if filter empty | `revalidate=300` | Keep |
| `/guides` | Editorial index | Index | Index | Self | Static | None | Footer | — | Low | New |
| `/guides/[slug]` | Holiday + method guides | Index if published | Index if `indexable` | Self | Dynamic | Article + BreadcrumbList | Related hubs | Scheduled pages 404 until review | Bounded product sample | New; no auto year bump |
| `/methodology` | How we verify | Index | Index | Self | Static | None | About, footer, guides | Must stay factual | Low | New |
| `/about` | Brand story | Index | Index | Self | Static | None | Footer | Stats | FD | Links methodology |
| `/contact` `/press` `/partners` `/privacy` `/terms` | Trust / legal | Index | Index | Self | Static | None | Footer | Affiliate disclosure in terms | Low | Keep |
| `/quiz` | Style quiz | Index | Index | Self | Static | None | Footer | Client quiz | CO | Keep; unique |
| `/scanner` | Scan / app CTA | Index | Index | Self | Static | None | Nav | — | Low | Keep |
| `/chat` | Advisor | Index was default | **noindex, follow** | Self | noindex | None | — | Thin | CO | Implemented |
| `/rewards` | Loyalty marketing | Index | Index | None explicit | Title | None | Footer account cluster | — | FD | Add canonical later (P1 leftover) |
| `/account` `/signup` | Auth | Were indexable | **noindex, nofollow** | Self | noindex | None | Footer (account) | PII | no-store | Implemented |
| `/reset-password` `/unsubscribe` `/leaving` | Transactional | Were indexable | **noindex, nofollow** | n/a | layout metadata | None | — | Affiliate hop must stay | no-store | Implemented |
| `/extension/auth` | Chrome sign-in | Already noindex | noindex, nofollow | n/a | Existing | None | — | — | — | Keep |
| `/inspirations/[id]` | Private capture | noindex | noindex, nofollow | n/a | Existing | None | — | User content | — | Disallow |
| `/open` | App open | noindex | noindex | n/a | Existing | None | Campaigns | Attribution | — | Disallow; do not sitemap |
| `/download` | 302 to App Store | Redirect | Do not index | n/a | Route handler | None | Legacy | Click tracking | — | Not in sitemap |
| `/dashboard/*` | Founder HQ | noindex | noindex, nofollow | n/a | Layout | None | — | Confidential | no-store, FD | Disallow |
| `/platform` `/platform/login` `/platform/docs` | Partner | Mixed | Index `/platform`; **noindex login** | Self | Login noindex added | None | Footer | — | — | Login noindex |
| `/khiteri` | Founder personal | noindex | noindex | n/a | Existing | None | — | — | — | Disallow |
| `/api/*` | APIs | n/a | Disallow except sitemap alias | n/a | n/a | n/a | n/a | — | Sitemap chunks bounded | `/api/sitemap` 308s to `/sitemap.xml` |

## Query-parameter allowlist (indexable)

None. Public indexable URLs are path-only.

## Sitemap families (`/sitemap.xml`)

| Family | File pattern | Cap |
| --- | --- | --- |
| Static + materials + collections + published guides | `/sitemap/static.xml` | Allowlisted paths only |
| Brands | `/sitemap/brands-0.xml`, `brands-1.xml` | 1,000 × 2 |
| Products | `/sitemap/products-0.xml` … `products-19.xml` | 1,000 × 20, eligibility filter |

No `changefreq` / `priority`. Product `lastmod` omitted until a trustworthy per-row timestamp is selected in a bounded query. Static `lastmod` is the 18 August 2026 review date, not request time.

Submit in Search Console: **`https://www.intertexe.com/sitemap.xml`**
