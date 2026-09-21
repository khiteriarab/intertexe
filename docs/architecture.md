# INTERTEXE repository architecture

Onboarding map for engineers. For fashion-brand vs organization naming, see [`brand-domain-naming-audit.md`](./brand-domain-naming-audit.md). For hosts and cookies, see [`b2b-entry-architecture.md`](./b2b-entry-architecture.md) (sales path is `/brands`).

## Start here

- **Consumer product** → `app/` consumer routes (`designers`, `shop`, …) / catalog helpers in `lib/` (`brand-*`, `catalog-*`, …)
- **Enterprise SaaS** → `app/dashboard/(org)/` / `lib/enterprise/`
- **Internal HQ** → `app/dashboard/(app)/` / `lib/dashboard/`

- **Consumer DB** → `getConsumerSupabase`
- **Enterprise DB** → `getObeliskServiceClient`

Treat this layout as the baseline. Do not restructure unless a product feature, deployment need, security issue, or extraction task requires it.

## Surfaces (one line each)

| Surface | What it is | Where to look |
|---------|------------|---------------|
| **Consumer product** | Shoppers: catalog, designers, shop, scanner, accounts | `app/` routes except `brands`/`platform`/`dashboard`; `lib/*` catalog helpers |
| **Enterprise marketing** | Public B2B site (“INTERTEXE for Brands”) | Canonical `app/brands/**`; UI source `app/platform/**`; helpers `lib/enterprise-marketing/` |
| **Enterprise SaaS** | Authenticated org workspaces | `platform.intertexe.com`; `app/dashboard/(org)/[organization]/**`; `lib/enterprise/**`; schema `enterprise/supabase/` |
| **HQ / internal** | Founder operating system | `app/dashboard/(app)/**`; `lib/dashboard/**`; consumer Supabase HQ tables |
| **Shared** | Truly cross-cutting only | `packages/brand` (CSS tokens), `app/shared/`, small utils with no domain data access |

**Entities:** A shopper-facing fashion **brand** (`brand_slug`, `/designers`) is not an SaaS **organization** (`organizations` on obelisk). Same company may have both; they do not share routing, auth, or DB clients.

## Hosts

| Host | Role |
|------|------|
| `www.intertexe.com` | Consumer + public marketing (`/brands`) |
| `platform.intertexe.com` | Enterprise login + SaaS (`/dashboard/...`) |
| `dashboard.intertexe.com` / `hq.*` | Legacy HQ host → `/dashboard` |

## Backends (never mix)

| Project | Code clients | Env (values — do not rename in prod) | Holds |
|---------|--------------|--------------------------------------|-------|
| **Consumer + HQ** (`intertexe`) | `getConsumerSupabase`, `getConsumerAnonAuthClient`, `createConsumerBrowserClient` | `SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*` | Catalog, shoppers, HQ tables |
| **Obelisk** (`obelisk-core`) | `getObeliskServiceClient`, `getObeliskUserClient`, `getObeliskAnonClient` | `ENTERPRISE_SUPABASE_*`, `NEXT_PUBLIC_ENTERPRISE_SUPABASE_*` | Organizations, products, passports, org members |

Deprecated aliases (`getServerSupabase`, `getEnterpriseServiceClient`, …) still work; prefer the names above in new code.

**Intentional bridges** (enterprise module → consumer/HQ DB): `lib/enterprise/hq-refs.ts`, `identity-links.ts`, `provision-staff-principal.ts` — pointers / staff identity only. Never copy org catalogs into HQ.

**Resale buyers** use consumer Auth (`lib/enterprise/resale-auth.ts`) — shoppers, not org operators.

## Folder map

```text
app/
  designers/, shop/, product/, materials/, …   Consumer product
  brands/                                      Enterprise marketing routes (canonical)
  platform/                                    Marketing UI + CSS (served via /brands and legacy /platform)
  dashboard/(app)/                             HQ / internal
  dashboard/(org)/[organization]/              SaaS org workspace
  api/dashboard/org/                           SaaS APIs
  api/…                                        Mostly consumer; v1 product APIs → obelisk

lib/
  enterprise/                                  SaaS domain (obelisk)
  enterprise-marketing/                        Public /brands path helpers
  dashboard/                                   HQ tooling (consumer Supabase)
  brand-*, catalog-*, shoppable-brands, …    Consumer catalog (fashion brands)
  supabase-service-client.ts                   Consumer/HQ client factory
  supabase/                                    Browser/server consumer + enterprise-browser

enterprise/supabase/                           Obelisk migrations only
supabase/                                      Consumer/HQ migrations
packages/brand/                                Design tokens only (not a domain model)
intertexe-enterprise/                          Future marketing extraction staging (README only)
```

## Where new code should go

| If you are building… | Put it in… | Client |
|----------------------|------------|--------|
| Shopper UI or catalog query | `app/<consumer-route>`, `lib/<catalog-helper>` | `getConsumerSupabase` |
| Fashion brand directory / PLP | `app/designers`, `lib/brand-*` / catalog | Consumer |
| Public B2B marketing page | Route under `app/brands/`; UI in `app/platform/` for now | None / lead APIs |
| Org workspace feature | `app/dashboard/(org)/...`, `lib/enterprise/` | `getObelisk*` |
| Founder HQ metric / CRM | `app/dashboard/(app)/`, `lib/dashboard/` | `getConsumerSupabase` |
| Obelisk migration | `enterprise/supabase/migrations/` | — |
| Consumer migration | `supabase/migrations/` | — |
| Shared visual token | `packages/brand/tokens.css` | — |

## Do not

- Import `lib/enterprise` from consumer shop/designer pages (except shared types with no client).
- Use consumer Supabase for `organizations` / org products / org auth.
- Use obelisk for catalog `brand_slug` / shopper accounts.
- Add a catch-all `/brands/[slug]` for fashion brands (assets stay `public/brands/*.*`; discovery stays `/designers`).
- Globally rename consumer `brand_*` to organization.

## Related docs

| Doc | Topic |
|-----|--------|
| [`brand-domain-naming-audit.md`](./brand-domain-naming-audit.md) | Brand vs organization naming |
| [`brands-phase1-redirect-map.md`](./brands-phase1-redirect-map.md) | `/brands` / `/platform` cutover |
| [`enterprise-environments.md`](./enterprise-environments.md) | Two Supabase projects |
| [`enterprise-entity-model.md`](./enterprise-entity-model.md) | Org → catalog → passport chain |
| [`b2b-entry-architecture.md`](./b2b-entry-architecture.md) | Hosts, cookies, login URLs |
