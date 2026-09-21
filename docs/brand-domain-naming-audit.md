# Brand / brands domain naming audit

**Goal:** Keep shopper-facing fashion **brands** and enterprise SaaS **organizations** as separate domain entities — before repo split.

**Hard rule:** A shopper-facing fashion brand is **not** an enterprise organization. The same real-world company may be represented by both (consumer catalog brand + SaaS org), but those are **two entities**. They must **not** share routing, auth assumptions, or database clients.

**Do not** perform global `brand` → `organization` renames. `Brand` remains a valid domain term in the consumer catalog and product data model (`brand_slug`, `brand_name`, brand profiles, etc.). Only **enterprise account / operator** concepts that wrongly said “brand” should use organization terminology.

**Public marketing copy** may still say “brands” (audience: companies who buy INTERTEXE). That is messaging, not the consumer catalog entity.

---

## Two entities (may map to one company)

| Entity | Domain | Identity | Routes | Auth | Supabase |
|--------|--------|----------|--------|------|----------|
| **Fashion brand** | Consumer catalog | `brand_slug` / designers directory | `/designers`, `/shop`, product pages | Consumer shopper accounts | Consumer project (`getConsumerSupabase`) |
| **Organization** | Enterprise SaaS | `organizations.id` / `.slug` | `platform.intertexe.com` + `/dashboard/[organization]` | Obelisk org operators | Obelisk (`getObeliskServiceClient`) |
| **Enterprise marketing** | B2B sales site | n/a (not a tenant) | `/brands/*` (canonical); `/platform/*` legacy alias | None (public) | Lead forms only; not org data |

Never: route a designer through `/brands` as if it were an org; never resolve org auth with the consumer client; never query `organizations` with the consumer catalog client (or vice versa).

---

## Audience / route truth (target)

| Surface | Audience | Canonical |
|---------|----------|-----------|
| `/` `/shop` `/designers` `/materials` … | Consumer shoppers | Consumer app |
| `/designers`, `/designers/[slug]` | Fashion brand / designer discovery | Consumer |
| `/brands`, `/brands/...` | B2B enterprise **marketing** | Enterprise marketing |
| `platform.intertexe.com` + `/dashboard/(org)/[organization]` | Authenticated SaaS | Enterprise SaaS |
| `/dashboard/retail-brands` (was `/dashboard/brands`) | Founder HQ analytics of **retail** fashion brands | Consumer data in HQ |
| `public/brands/*.{jpg,png}` | Fashion brand photography assets | Consumer assets (URL prefix only) |

---

## 1. Ambiguous brand-related identifiers

| Identifier | Location | Actual domain | Ambiguity | Risk |
|------------|----------|---------------|-----------|------|
| `/brands` route | `app/brands/page.tsx` | Was redirect → `/designers`; Phase 1 → enterprise marketing | **Critical** — SEO + audience collision | High if redirect/marketing flip race |
| `public/brands/*` | Static assets | Consumer fashion brand images | Same prefix as marketing routes | Low (extensions vs App Router) |
| `PLATFORM_SALES_PATH = "/brands"` | `lib/platform-urls.ts` | Enterprise marketing | Name says “platform” path is brands | Medium |
| `marketingPath` / `MARKETING_BASE` | `lib/enterprise-marketing/paths.ts` | Enterprise marketing | OK if documented; do not reuse for designers | Low if disciplined |
| `ClientApp` `B2B_ROUTE_PREFIXES` includes `/brands` | `app/components/ClientApp.tsx` | Hides consumer chrome for marketing | Also matches any future `/brands/[slug]` | Medium |
| `BrandCard` (CatalogMarquee) | `app/platform/CatalogMarquee.tsx` | Fashion brand **names** on B2B page | Looks like SaaS org card | Medium |
| `PlatformBrandShowcaseHero` / `platform-brand-showcase` | Marketing | Fashion tiles in B2B hero | “Brand” = fashion, not org | Medium |
| `provisionBrandOperator` | Was enterprise onboarding | SaaS org member | Sounded like consumer brand | **Renamed** → organization operator |
| `DEMO_BRAND_SLUG` | Was demo tenant | Demo **organization** | Confusable with fashion brand slug | **Aliased** → `DEMO_ORGANIZATION_SLUG` |
| `isEnterpriseBrandAccount` | Password reset | Obelisk org member | vs HQ `brand_accounts` metric | **Renamed** → organization account |
| Sustainability “Brand” analytics | `lib/sustainability/*` | Org-scoped SaaS metrics | “Brand” meant org | **Renamed** → organization analytics |
| `brand_accounts` | HQ outreach SQL | B2B **prospect** CRM count | Not fashion brands; not org table | Medium — document only |
| `/dashboard/brands` | HQ retail fashion analytics | Consumer scan/click brands | Looked like marketing `/brands` | **Moved** → `/dashboard/retail-brands` |
| `@intertexe/brand` package | `packages/brand` | CSS tokens only | Package name “brand” | Low if README clear |
| `BrandProfile`, `brand_slug`, `fetchProductsByBrand` | Consumer catalog | Fashion brand entity | **Valid domain term — keep** | Do not rename to organization |
| `PassportExperienceBranding` | Passport chrome | Visual branding | OK (branding ≠ brand entity) | Safe |
| `B2B_BUYER_TYPES` includes `"brand"` | CRM | Prospect type | Overlaps word “brand” | Medium — CRM only |

---

## 2. Consumer-only identifiers (**keep “brand”**)

| Identifier | Files (representative) | Notes |
|------------|------------------------|-------|
| Routes `/designers`, `/designers/[slug]` | `app/designers/**` | Discovery UX; fashion brands underneath — **do not redirect to `/brands`** |
| `brand_slug` / `brand_name` on products | Catalog / schema | **Canonical consumer brand fields — keep** |
| `BrandProfile`, `getBrandProfile`, `BRAND_PROFILES` | `lib/brand-profiles.ts` | Valid fashion-brand editorial model |
| `BrandEditorialSections`, `BrandEditorialImage` | `app/designers`, `app/components` | Consumer UI |
| `BrandsWeLoveSection` | `app/components` | Consumer homepage |
| `lib/brand-hero-images.ts`, `lib/brand-display.ts` | Consumer catalog | |
| `lib/shoppable-brands.ts`, `fetchShoppableBrands` | Consumer | |
| `fetchProductsByBrand*`, `fetchBrandStats`, `fetchMoreFromBrand` | `lib/supabase-server.ts` | Consumer catalog queries |
| `BrandStat`, `getCachedBrandStats` | `lib/cached-catalog.ts` | Directory stats |
| `public/brands/*` asset URLs | Hero photography | Keep; not marketing pages |

**Optional clarity (not required):** prefix helpers with `Consumer` only when a symbol sits next to enterprise code and ambiguity is real (e.g. `ConsumerBrandProfile` alias). **Do not** rename consumer brands to organizations. **Do not** force a global Brand→Designer rename of the data model.

---

## 3. Enterprise-only identifiers (account / operator → organization)

| Identifier | Files | Notes |
|------------|-------|-------|
| `organizations`, `organization_id`, `workspaces` | `enterprise/supabase/migrations/002_organizations.sql` | **Canonical SaaS tenant — keep** |
| `app/dashboard/(org)/[organization]/**` | SaaS UI | Correct |
| `getEnterpriseServiceClient` / `getObelisk*` | `lib/enterprise/client.ts` | Obelisk only |
| `ENTERPRISE_SUPABASE_*` env | Docs + client | Never fall back to consumer URL |
| `/brands` marketing tree | `app/brands/**` | Marketing for buyers of INTERTEXE — **not** a fashion-brand page and **not** an org workspace |
| Operator provisioning | `provisionOrganizationOperator` | Was “brand operator” |
| Demo tenant slug | `DEMO_ORGANIZATION_SLUG` | Was `DEMO_BRAND_SLUG` |
| Org sustainability rollups | `OrganizationSustainabilityAnalytics` | Was “Brand” analytics |

**Safe to keep as marketing language:** nav “For brands”, titles “INTERTEXE for Brands”.

---

## 4. Shared identifiers that are safe

| Identifier | Why safe |
|------------|----------|
| `PassportExperienceBranding` | Visual branding, not a domain entity |
| Product `brand` / `brand_name` on **consumer** catalog rows | Fashion brand attribute; enterprise products scope by `organization_id` |
| `packages/brand` tokens | Design system; not a domain entity |
| Marketing strings “for brands” | B2B audience messaging |
| `organizationId` / `organization_id` | Already unambiguous SaaS |

**Not shared:** There is no single `Brand` type that means both fashion label and SaaS tenant. If a company has both, link them explicitly later (e.g. HQ deal → `enterprise_organization_id`); do not collapse identities.

---

## 5. Route conflicts

| Conflict | Status | Action |
|----------|--------|--------|
| `/brands` → `/designers` redirect vs enterprise marketing | Phase 1 retires redirect | Canonical marketing at `/brands`; never reverse |
| `/brands/*.jpg` vs `/brands/solutions` | Extension vs path | Safe if no catch-all fashion `[slug]` under `/brands` |
| `/dashboard/retail-brands` vs `/brands` | HQ retail fashion vs marketing | Keep separate |
| `/platform/*` vs `/brands/*` | Legacy alias | Dual serve with **canonical → `/brands`**; 301 later |
| `/designers` ↔ `/brands` | Must never cross-redirect | Enforce in tests |
| Org workspace ↔ fashion brand slug | Different hosts/paths | Never treat `organizations.slug` as `/designers/[slug]` |

---

## 6. Supabase-client risks

| Client export | Env | Project | Risk |
|---------------|-----|---------|------|
| `getConsumerSupabase` (alias `getServerSupabase`) | `SUPABASE_*` | Consumer + HQ | Fashion brands / catalog / shoppers |
| `getObeliskServiceClient` (alias `getEnterpriseServiceClient`) | `ENTERPRISE_SUPABASE_*` | obelisk-core | Organizations / operators |
| `createEnterpriseServiceClient` | Same | obelisk | Delegates to obelisk helper (URL≠consumer guard) |
| `lib/enterprise/resale-auth.ts` | Consumer Auth | Consumer | **Intentional** — resale buyers are shoppers, not org operators |

Wrong-project scenarios to prevent: passing consumer client into org helpers; resolving org login with consumer Auth; querying fashion `brand_slug` tables with obelisk (or `organizations` with consumer).

---

## 7. Database tables

| Table / column | Project | Ambiguous? | Action |
|----------------|---------|------------|--------|
| `organizations`, memberships, workspaces | obelisk | No | Keep |
| Catalog `brand_slug` / `brand_name` / `designers` | consumer | Name “brand” is **correct** here | **No rename to organization** |
| HQ `brand_accounts` metric | consumer HQ | CRM prospect count | Document; optional metric rename later |
| Cross-link HQ deal → `enterprise_organization_id` | pointer only | Not a merged entity | Keep as explicit link |

**Do not change schema** to unify brand and organization.

---

## 8. SEO / redirects / sitemap / nav

| Item | Issue | Action |
|------|-------|--------|
| Sitemap | Index `/brands/*` marketing + `/designers` | Never drop designers for brands marketing |
| Canonicals on `/platform` | Dual index risk | Point to `/brands/...` |
| CookieConsent | Hide on `/brands` + `/platform` | Done |
| Affiliate `/brands`→designers | Retired | Fashion brands stay on `/designers` |

---

## 9. Recommended rename map (scoped)

### Supabase clients — OK to clarify

| Current | Preferred | Strategy |
|---------|-----------|----------|
| `getServerSupabase` | `getConsumerSupabase` | Alias (done) |
| `getEnterpriseServiceClient` | `getObeliskServiceClient` | Alias (done) |

### Enterprise account / operator only

| Current | Preferred |
|---------|-----------|
| `provisionBrandOperator` | `provisionOrganizationOperator` (done) |
| `DEMO_BRAND_SLUG` | `DEMO_ORGANIZATION_SLUG` (done) |
| `isEnterpriseBrandAccount` | `isEnterpriseOrganizationAccount` (done) |
| Org-scoped “Brand” sustainability helpers | `Organization*` (done) |

### Consumer catalog — **do not rename away from brand**

| Keep | Notes |
|------|-------|
| `brand_slug`, `brand_name`, `BrandProfile`, `fetchProductsByBrand`, `BrandStat`, `getShopBrands` | Valid fashion-brand domain vocabulary |
| `public/brands/*` | Asset URLs |
| Marketing “for brands” copy | Audience messaging |

### Routes / helpers (do not conflate)

| Helper | Meaning |
|--------|---------|
| `marketingPath()` / `MARKETING_BASE="/brands"` | Enterprise marketing only |
| Designers / fashion brand pages | `/designers/...` |
| SaaS org paths | `/dashboard/[organization]/...` on platform host |

### Do **not** rename

- Consumer catalog brand fields or global Brand→Organization  
- Production env **values**  
- DB `organizations` or consumer `brand_*` schemas  
- `@intertexe/brand` token package  

---

## 10. Files affected (by wave)

**Done — clients & enterprise operator clarity & `/brands` marketing.**  

**Stopped — Wave D consumer Brand→Designer / Brand→Organization bulk renames.** Not required; brand is the correct consumer term.

---

## 11. Migration risk

| Work | Risk | Policy |
|------|------|--------|
| Client aliases | Low | Keep |
| Enterprise operator renames | Low–medium | Keep aliases |
| Further consumer brand renames | Unnecessary | **Do not continue** |
| Schema / env value renames | High / wrong | **Do not** |

---

## 12. Implementation order (remaining)

1. Hold the two-entity boundary (this doc).  
2. No further brand→organization renames.  
3. After marketing verification: permanent `/platform` → `/brands` 301.  
4. Defer SaaS extraction; keep clients project-explicit.

---

## Inventory summary

- Consumer fashion **brand** and enterprise **organization** are separate entities (one company may have both).  
- They must not share routing, auth, or Supabase clients.  
- Rename only enterprise account/operator symbols that misused “brand.”  
- Keep catalog `brand_*` vocabulary.  
