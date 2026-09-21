# Brand / brands domain naming audit

**Goal:** Make consumer fashion brands (designers) and enterprise SaaS customers (organizations) impossible to confuse in code — before repo split.

**Public marketing copy** may still say “brands.” This audit is about **internal identifiers, clients, types, and routes.**

---

## Audience / route truth (target)

| Surface | Audience | Canonical |
|---------|----------|-----------|
| `/` `/shop` `/designers` `/materials` … | Consumer shoppers | Consumer app |
| `/designers`, `/designers/[slug]` | Fashion label discovery | Consumer |
| `/brands`, `/brands/...` | B2B enterprise **marketing** | Enterprise marketing |
| `platform.intertexe.com` + `/dashboard/(org)/[organization]` | Authenticated SaaS | Enterprise SaaS |
| `/dashboard/brands` | Founder HQ analytics of **retail** labels | Consumer data in HQ (misnamed path) |
| `public/brands/*.{jpg,png}` | Designer photography assets | Consumer assets (URL prefix only) |

---

## 1. Ambiguous brand-related identifiers

| Identifier | Location | Actual domain | Ambiguity | Risk |
|------------|----------|---------------|-----------|------|
| `/brands` route | `app/brands/page.tsx` | Was redirect → `/designers`; Phase 1 → enterprise marketing | **Critical** — SEO + audience collision | High if redirect/marketing flip race |
| `public/brands/*` | Static assets | Consumer designer images | Same prefix as marketing routes | Low (extensions vs App Router) |
| `PLATFORM_SALES_PATH = "/brands"` | `lib/platform-urls.ts` | Enterprise marketing | Name says “platform” path is brands | Medium |
| `marketingPath` / `MARKETING_BASE` | `lib/enterprise-marketing/paths.ts` | Enterprise marketing | OK if documented; do not reuse for designers | Low if disciplined |
| `ClientApp` `B2B_ROUTE_PREFIXES` includes `/brands` | `app/components/ClientApp.tsx` | Hides consumer chrome for marketing | Also matches any future `/brands/[slug]` | Medium |
| `BrandCard` | `app/platform/CatalogMarquee.tsx` | Fashion label **names** on B2B page | Looks like SaaS org card | Medium |
| `PlatformBrandShowcaseHero` / `platform-brand-showcase` | Marketing | Fashion tiles in B2B hero | “Brand” = fashion, not org | Medium |
| `provisionBrandOperator` | `lib/enterprise/provision-brand-operator.ts` | SaaS org member | Sounds like consumer brand | High for onboarding bugs |
| `DEMO_BRAND_SLUG` | `lib/enterprise/constants.ts` | Demo **organization** | Confusable with designer slug | High |
| `isEnterpriseBrandAccount` | `app/api/dashboard/forgot-password/route.ts` | Obelisk profile/member | “Brand account” vs HQ `brand_accounts` metric | High |
| `BrandSustainabilityAnalytics` / `loadBrandSustainabilityAnalytics` | `lib/sustainability/*` | Org-scoped SaaS metrics | “Brand” = org | High |
| `brand_accounts` | HQ outreach SQL / `lib/dashboard/outreach.ts` | Count of B2B **prospect** orgs | Not fashion brands; not org table | Medium |
| `/dashboard/brands` | HQ “Brand Intelligence” | Consumer scan/click **retail** brands | Path looks like enterprise marketing | High for nav confusion |
| `@intertexe/brand` package | `packages/brand` | CSS tokens only | Package name “brand” | Low if README clear |
| `BrandProfile` / `getBrandProfile` | `lib/brand-profiles.ts` | Consumer designer editorial | Generic “Brand” | Medium |
| `BrandStat` / `fetchBrandStats` | `lib/cached-catalog.ts`, `lib/supabase-server.ts` | Consumer directory stats | Generic | Medium |
| `getShopBrands` | `app/shop/actions.ts` | Consumer shop filters | Generic | Medium |
| `PassportExperienceBranding` | `lib/enterprise/passport-experience.ts` | Visual branding of passport | OK (branding ≠ brand entity) | Safe |
| `B2B_BUYER_TYPES` includes `"brand"` | `lib/dashboard/pilot-motherboard.ts` | CRM buyer type for SaaS prospect | Overlaps word “brand” | Medium |

---

## 2. Consumer-only identifiers (keep / rename toward designer|consumerBrand)

| Identifier | Files (representative) | Notes |
|------------|------------------------|-------|
| Routes `/designers`, `/designers/[slug]` | `app/designers/**` | Canonical consumer discovery — **do not redirect to `/brands`** |
| `BrandEditorialSections`, `BrandEditorialImage`, `BrandWordmark` | `app/designers`, `app/components` | Consumer UI |
| `BrandsWeLoveSection` | `app/components` | Consumer homepage |
| `lib/brand-hero-images.ts`, `lib/brand-profiles.ts`, `lib/brand-display.ts` | Consumer catalog | |
| `lib/shoppable-brands.ts`, `fetchShoppableBrands` | Consumer | |
| `fetchProductsByBrand*`, `fetchBrandStats`, `fetchMoreFromBrand` | `lib/supabase-server.ts` | Consumer catalog queries |
| `getCachedBrandStats`, `BrandStat` | `lib/cached-catalog.ts` | Designers directory |
| `client/src/lib/brand-*`, `BrandImage`, `SimilarBrandCard` | Legacy Vite client | Consumer |
| `public/brands/*` asset URLs | `lib/brand-hero-images.ts`, etc. | Keep URLs; not marketing pages |
| Tables / catalog brand directory | `supabase/migrations/*brand*` | Consumer project |

**Preferred renames (incremental):** `BrandProfile`→`ConsumerBrandProfile`, `getBrandProfile`→`getConsumerBrandProfile`, `BrandStat`→`ConsumerBrandStat` / `DesignerStat`, `BrandCard` (consumer)→`DesignerCard`, `getShopBrands`→`getShopConsumerBrands`, `fetchBrandStats`→`fetchConsumerBrandStats`.

---

## 3. Enterprise-only identifiers (keep / rename toward organization|brandAccount)

| Identifier | Files | Notes |
|------------|-------|-------|
| `organizations`, `organization_id`, `workspaces` | `enterprise/supabase/migrations/002_organizations.sql` | **Already correct** — do not rename schema |
| `app/dashboard/(org)/[organization]/**` | SaaS UI | Correct |
| `getEnterpriseServiceClient`, `getEnterpriseUserClient` | `lib/enterprise/client.ts` | Correct; add `obelisk*` aliases |
| `ENTERPRISE_SUPABASE_*` env | Docs + client | Correct; optional `OBELISK_*` aliases later (no secret value change) |
| `/brands` marketing tree | `app/brands/**`, `app/platform/**` UI | Enterprise **marketing**, not SaaS data |
| `provisionBrandOperator` | Enterprise onboarding | Rename → `provisionOrganizationOperator` |
| `DEMO_BRAND_SLUG` | Demo tenant | Rename → `DEMO_ORGANIZATION_SLUG` |
| `isEnterpriseBrandAccount` | Password reset routing | Rename → `isEnterpriseOrganizationAccount` |
| Sustainability “brand” analytics | Org metrics | Rename → `OrganizationSustainabilityAnalytics` |

**Safe to keep as marketing language:** nav “For brands”, titles “INTERTEXE for Brands”, `PlatformBrandShowcaseHero` display copy.

---

## 4. Shared identifiers that are safe

| Identifier | Why safe |
|------------|----------|
| `PassportExperienceBranding` | Means visual branding, not a domain entity |
| Product fields `brand` / `brand_name` on **catalog** rows | Consumer product attribute; enterprise products use org scope via `organization_id` |
| `packages/brand` tokens (`--itx-gold`, etc.) | Design system primitives; document as non-entity |
| Word “brand” in user-visible marketing strings | Intentional B2B messaging |
| `organizationId` / `organization_id` in enterprise code | Already unambiguous |

---

## 5. Route conflicts

| Conflict | Status | Action |
|----------|--------|--------|
| `/brands` → `/designers` redirect vs enterprise marketing | Phase 1 retires redirect | Canonical marketing at `/brands`; never reverse |
| `/brands/*.jpg` vs `/brands/solutions` | Extension vs path | Safe if no catch-all `[slug]` under `/brands` for designers |
| `/dashboard/brands` vs `/brands` | HQ vs marketing | Rename HQ path to `/dashboard/retail-brands` (or `designer-intelligence`) + redirect |
| `/platform/*` vs `/brands/*` | Legacy alias | Dual serve Phase 1 with **canonical → `/brands`**; 301 later |
| `/designers` ↔ `/brands` | Must never cross-redirect | Enforce in middleware/tests |
| Consumer deep links `/brands/${slug}` | Broken; fixed toward `/designers/${slug}` | Keep fixed |
| `platform.intertexe.com/platform` | Middleware redirects to www | OK |

---

## 6. Supabase-client risks

| Client export | Env | Project | Risk |
|---------------|-----|---------|------|
| `getServerSupabase` | `SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*` | Consumer + HQ (`intertexe`) | Generic name — easy to misuse near enterprise |
| `createServiceClient` / `createClient` in `lib/supabase/server.ts` | Same | Consumer | Generic `createClient` name |
| `createClientComponentClient` | `NEXT_PUBLIC_SUPABASE_*` | Consumer browser | Generic |
| `getSupabaseAnonAuthClient` / `getSupabaseAuthUserId` | Consumer | Consumer auth | Used from `lib/enterprise/resale-auth.ts` — **verify intentional** (resale buyer vs org user) |
| `getEnterpriseServiceClient` / `getEnterpriseUserClient` / `getEnterpriseAnonClient` | `ENTERPRISE_SUPABASE_*` | obelisk-core | Good; guard refuses URL == consumer |
| `createEnterpriseServiceClient` | Duplicate of enterprise service | obelisk | Duplicate entrypoint — consolidate aliases |
| `createEnterpriseClientComponentClient` | `NEXT_PUBLIC_ENTERPRISE_SUPABASE_*` | obelisk browser | OK |

**Wrong-project scenarios to prevent:**

1. Passing `getServerSupabase()` into org-scoped helpers that expect obelisk.
2. Enterprise helpers typed only as `SupabaseClient` with no brand in the name at call sites.
3. `provision-staff-principal` / `hq-refs` correctly use consumer HQ client — keep explicit `consumer` naming.

**Preferred code names (aliases first; env names unchanged in prod):**

- `getConsumerSupabase` → same as `getServerSupabase`
- `getObeliskServiceClient` → same as `getEnterpriseServiceClient`
- `getObeliskUserClient` → same as `getEnterpriseUserClient`
- Optional later env aliases: `OBELISK_SUPABASE_URL` reading same value as `ENTERPRISE_SUPABASE_URL` (do **not** change Vercel secret values)

---

## 7. Database tables

| Table / column | Project | Ambiguous? | Action |
|----------------|---------|------------|--------|
| `organizations`, `organization_memberships`, `workspaces` | obelisk | No | Keep |
| Catalog `products.brand` / brand directory | consumer | Name “brand” OK in consumer DB | No schema change |
| HQ `brand_accounts` metric (RPC/json) | consumer HQ | Means B2B prospects | Rename metric key in a follow-up if cheap; else document |
| No shared `brands` table spanning both projects | — | Safe | Do not create cross-project `brands` |

**Do not change schema unless absolutely necessary.**

---

## 8. SEO / redirects / sitemap / nav

| Item | Issue | Action |
|------|-------|--------|
| Sitemap lists `/platform` not `/brands` | Dual indexing risk during cutover | Index `/brands/*` only; drop `/platform` after 301 |
| Platform page canonicals still `/platform/...` | Dual indexed | Point canonical to `/brands/...` |
| CookieConsent hides on `/platform` only | Marketing `/brands` may show consumer cookies | Add `/brands` to hide prefixes |
| Nav “For brands” → marketing | OK | Keep copy; hrefs → `/brands` |
| Affiliate expectation `/brands`→designers | Retiring | External links need 301 period only if historically indexed as designers — inventory says sitemap never listed `/brands` as designers |

---

## 9. Recommended rename map (internal)

### Supabase clients (do first)

| Current | Preferred | Strategy |
|---------|-----------|----------|
| `getServerSupabase` | `getConsumerSupabase` | Alias + gradually switch imports |
| `createClient` (`lib/supabase/server.ts`) | `createConsumerAnonClient` | Alias |
| `createServiceClient` | `createConsumerServiceClient` | Alias |
| `createClientComponentClient` | `createConsumerBrowserClient` | Alias |
| `getSupabaseAnonAuthClient` | `getConsumerAnonAuthClient` | Alias |
| `getEnterpriseServiceClient` | `getObeliskServiceClient` | Alias (keep enterprise name) |
| `getEnterpriseUserClient` | `getObeliskUserClient` | Alias |
| `getEnterpriseAnonClient` | `getObeliskAnonClient` | Alias |

### Enterprise domain

| Current | Preferred |
|---------|-----------|
| `provisionBrandOperator` | `provisionOrganizationOperator` |
| `ProvisionBrandOperatorResult` | `ProvisionOrganizationOperatorResult` |
| `DEMO_BRAND_SLUG` | `DEMO_ORGANIZATION_SLUG` |
| `isEnterpriseBrandAccount` | `isEnterpriseOrganizationAccount` |
| `loadBrandSustainabilityAnalytics` | `loadOrganizationSustainabilityAnalytics` |
| `BrandSustainabilityAnalytics` | `OrganizationSustainabilityAnalytics` |
| file `provision-brand-operator.ts` | `provision-organization-operator.ts` (re-export old) |
| file `brand-analytics.ts` (sustainability) | `organization-analytics.ts` |
| HQ route `/dashboard/brands` | `/dashboard/retail-brands` (+ redirect) |
| outreach `brand_accounts` | `prospect_brand_accounts` or `enterprise_prospect_count` (metric only) |

### Consumer domain

| Current | Preferred |
|---------|-----------|
| `BrandProfile` | `ConsumerBrandProfile` |
| `getBrandProfile` | `getConsumerBrandProfile` |
| `BrandStat` | `ConsumerBrandStat` / `DesignerDirectoryStat` |
| `fetchBrandStats` | `fetchConsumerBrandStats` |
| `getShopBrands` | `getShopConsumerBrands` |
| `BrandCard` (CatalogMarquee) | `FashionBrandMarqueeCard` or `ShowcaseDesignerName` |
| `SimilarBrandCard` | `SimilarDesignerCard` |
| `BrandImage` | `DesignerImage` / `ConsumerBrandImage` |

### Routes / helpers (do not conflate)

| Helper | Meaning |
|--------|---------|
| `marketingPath()` / `MARKETING_BASE="/brands"` | Enterprise marketing only |
| Designers links | Always `/designers/...` — never `brandsPath` |
| SaaS org paths | `/dashboard/[organization]/...` or platform host |

### Do **not** rename (yet)

- `public/brands/*` URLs  
- Marketing headline copy  
- DB `organizations` schema  
- Production env **values**  
- `@intertexe/brand` token package (document only)  

---

## 10. Files affected (by wave)

**Wave A — clients & docs:**  
`lib/supabase-service-client.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase-auth-server.ts`, `lib/enterprise/client.ts`, `docs/enterprise-environments.md`, this audit.

**Wave B — enterprise identifiers:**  
`lib/enterprise/constants.ts`, `lib/enterprise/provision-brand-operator.ts` (+ re-export file), callers, `forgot-password/route.ts`, sustainability analytics + types + API route, tests matching old names.

**Wave C — HQ route clarity:**  
`app/dashboard/(app)/brands` → retail-brands + redirect; nav links.

**Wave D — consumer type aliases:**  
`lib/brand-profiles.ts`, `lib/cached-catalog.ts`, `lib/supabase-server.ts` exports, shop actions — aliases first, call-site migration gradual.

**Wave E — Phase 1 `/brands` marketing cutover:**  
(separate but related) `app/brands/**`, sitemap, platform canonicals, CookieConsent, tests.

---

## 11. Migration risk

| Wave | Risk | Why |
|------|------|-----|
| A aliases | **Low** | Additive; no behavior change |
| B renames + aliases | **Low–medium** | Tests assert symbol names; keep deprecated exports |
| C HQ path | **Medium** | Bookmarks/internal links |
| D consumer renames | **Medium–high** | Wide import surface; prefer aliases then codemod |
| Env var renames | **High** | Do not flip production without dual-read aliases |
| Schema renames | **Do not** | Unnecessary |

---

## 12. Exact implementation order

1. Publish this audit (no behavior change).  
2. Add `getConsumerSupabase` / `getObelisk*` aliases; document env mapping.  
3. Rename enterprise operator / demo slug / forgot-password helper with deprecated aliases; update tests.  
4. Rename sustainability org analytics symbols.  
5. Clarify HQ `/dashboard/brands` → `/dashboard/retail-brands`.  
6. Add consumer type/function aliases (`ConsumerBrandProfile`, etc.); migrate hot paths.  
7. Finish `/brands` marketing cutover (canonicals, sitemap, CookieConsent); keep `/platform` alias until verified.  
8. Per wave: typecheck/lint/build; smoke `/designers`, `/brands`, platform org workspace; confirm no client swap.  
9. Defer SaaS app extraction and env **value** changes.

---

## Inventory summary (search)

- ~330 files under `app`/`lib`/`client`/`server` mention brand/brands.  
- Enterprise data model already centers on **`organizations`**.  
- Highest confusion: **`/brands` URL**, **`provisionBrandOperator`**, **`DEMO_BRAND_SLUG`**, **`getServerSupabase` generic name**, **HQ `/dashboard/brands`**, **sustainability “Brand” analytics**.  
- Consumer fashion domain is dense but consistent around designers + catalog `brand` fields.  
)
