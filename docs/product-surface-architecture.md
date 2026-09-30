# INTERTEXE product-surface architecture

Assessment only — no repository split has been executed.
Date of inventory: 2026-09-21. Repo: `khiteriarab/intertexe` (single Next.js deployable).

---

## 1. CURRENT STRUCTURE

### What this repo is

One npm package (`rest-express`) shipping a **single Next.js App Router application**, host-routed by `middleware.ts`. It is **not** a packages/workspaces monorepo and **not** separate deployables for consumer vs enterprise vs SaaS.

Leftover parallel stacks still exist but are secondary:

| Path | Role today |
|------|------------|
| `app/` | Canonical Next.js App Router (all live surfaces) |
| `lib/` | Shared server/client libraries |
| `shared/` | Shared TS models/schema |
| `client/` | Legacy Vite SPA (alias `@/*`; ignored by Next webpack watch) |
| `server/` | Legacy Express entry (`npm run dev`) |
| `enterprise/` | Enterprise Supabase project config + migrations (`obelisk-core`) |
| `supabase/` | Consumer / Founder HQ Supabase migrations |
| `chrome-web-store/` | MV3 Chrome extension source |
| `public/` | Static assets (incl. `/platform/*` marketing media) |
| `emails/`, `docs/`, `scripts/` | Templates, runbooks, gates |

**iOS is not in this repo** (`intertexe-ios` is a sibling codebase). This repo only hosts AASA + App Store helpers.

### Surfaces living inside this one app

| Surface | Location | Public URL today |
|---------|----------|------------------|
| Consumer marketplace / discovery | `app/page.tsx`, `app/shop/`, `app/designers/`, `app/materials/`, `app/product/`, `app/scanner/`, `app/account/`, … | `https://www.intertexe.com` / `https://intertexe.com` |
| Enterprise marketing (“For Brands”) | `app/platform/**` | `https://www.intertexe.com/platform` (+ solutions, pricing, demo, request) |
| Authenticated SaaS + Founder HQ | `app/dashboard/**` | `https://platform.intertexe.com` → login + `/dashboard/...` |
| Public Digital Product Passports | `app/p/[id]/**` | `https://www.intertexe.com/p/[id]` |
| Chrome extension | `chrome-web-store/save-to-intertexe/` + `app/extension/`, `app/api/extension/` | Chrome Web Store + capture bridges |
| iOS | External repo | App Store + Universal Links via AASA in this repo |

### Host routing (already partially separates surfaces)

Documented in `docs/b2b-entry-architecture.md`:

| Host | Behavior |
|------|----------|
| `www` / apex | Consumer + `/platform` marketing + transitional `/dashboard` |
| `platform.intertexe.com` | `/` → enterprise login; `/platform*` redirected to www; authenticated SaaS |
| `dashboard.intertexe.com` / `hq.intertexe.com` | HQ / legacy dashboard host |

Sessions are **host-scoped cookies** (no `Domain=.intertexe.com`) — consumer and enterprise auth jars are already isolated at the cookie layer.

### Dual Supabase

| Project | Env prefix | Used by |
|---------|------------|---------|
| Consumer / HQ (`burrylupizvggupsryuj`) | `SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*` | Catalog, consumer auth, Founder HQ |
| Enterprise `obelisk-core` (`dpiksashuqetyzrjogal`) | `ENTERPRISE_SUPABASE_*` | Org SaaS tenants, passports, billing |

### Route classification (high level)

**Consumer:** `/`, `/shop`, `/designers`, `/materials`, `/product`, `/sale`, `/scanner`, `/account`, `/signup`, fabric landings, `/brands` → **redirects to `/designers`** (legacy affiliate).

**Enterprise marketing:** `/platform`, `/platform/solutions`, `/platform/pricing`, `/platform/demo`, `/platform/request`, `/platform/login` → enterprise login URL.

**SaaS auth:** `/dashboard/login`, `/dashboard/[organization]/*`, Founder HQ under `dashboard/(app)/`, SSO/reset flows.

**Public product data:** `/p/[id]`, `/p/[id]/json`, `/p/[id]/sell`.

**API:** `/api/dashboard/*`, `/api/v1/*`, `/api/platform/*`, `/api/auth/*`, `/api/cron/*`, `/api/extension/*`.

---

## 2. PROBLEMS

1. **Single deployable couples release cadence.** Consumer catalog bugs, marketing copy, and SaaS auth ship in one Vercel project. A bad marketing CSS change can block consumer/SaaS deploys and vice versa.

2. **Shared CSS token import graph.** `app/shared/intertexe-editorial.css` is imported by platform marketing, login, enterprise theme, and passport — so “brand polish” on one surface can visually bleed into others.

3. **`/brands` is already claimed by consumer.** `app/brands/page.tsx` redirects to `/designers`. Preferred marketing URL `intertexe.com/brands` **cannot** be claimed without migrating affiliate/legacy links first.

4. **Middleware + `lib/` gravity well.** Host logic, analytics, Supabase clients, enterprise fixtures, and platform URLs all sit in one tree. Extracting marketing without careful dependency cuts will either duplicate logic or create a fragile shared package too early.

5. **Legacy dual runtimes.** Express (`server/`) + Vite (`client/`) + Next coexist. Increases cognitive load and risk of editing the wrong surface.

6. **Public passports sit between products.** `/p/*` is consumer-facing but fed by enterprise governed records — belongs with platform services / shared API, not inside a pure marketing repo.

7. **Crons and env sprawl.** `vercel.json` crons are consumer/HQ-heavy; same project env carries Paddle, Meta Pixel, Rakuten, enterprise Supabase, APNs docs, etc.

8. **No automatic monorepo tooling.** Turning this into Turborepo/Nx “because separation” would add ceremony without solving host/cookie/SEO coupling. Prefer independent repos **or** a deliberate monorepo later — do not invent one by default.

---

## 3. RECOMMENDED STRUCTURE

Separate by **product surface**, not by SaaS feature module.

| Proposed repo / app | Owns | Does not own |
|---------------------|------|--------------|
| **intertexe-web** | Consumer marketplace / discovery | Enterprise marketing, org SaaS |
| **intertexe-enterprise** | Public B2B marketing + sales (`/platform` content, eventually under `/brands` path on www) | Authenticated dashboard |
| **intertexe-platform** | Authenticated B2B SaaS (`platform.intertexe.com`) including Product Intelligence, Traceability, Environmental Intelligence, DPP tooling, suppliers, workflows as **modules** | Public marketing pages |
| **intertexe-ios** | Native iOS (already separate) | — |
| **intertexe-extension** | Chrome extension (extract from `chrome-web-store/`) | — |
| **obelisk-core** | Shared backend / platform services (enterprise Supabase + APIs) | Front-end UX systems |

### Public URL structure (keep ecosystem coherent)

| URL | Surface |
|-----|---------|
| `https://intertexe.com` | Consumer |
| `https://intertexe.com/brands` | Enterprise marketing (**target**; blocked today by `/brands` → designers) |
| `https://intertexe.com/platform` | Keep as stable alias/redirect during migration |
| `https://platform.intertexe.com` | Authenticated SaaS |
| `https://intertexe.com/p/[id]` | Public passports (served via web or thin edge that calls obelisk APIs) |

**Do not** default to `brands.intertexe.com` unless routing forces it. Prefer path-based `/brands` on the consumer apex via Vercel rewrites once the legacy `/brands` → `/designers` conflict is retired.

### Shared design system (minimal)

Extract only **brand primitives**, not a giant component library:

- Logo / wordmark assets
- Typography tokens (serif + sans stacks)
- Color tokens (see § Brand tan confirmation)
- Spacing scale
- Primary/secondary button primitives
- Minimal nav wordmark link
- Optional base motion tokens

Consumer and enterprise UX systems should remain free to diverge.

### Auth

Keep consumer auth and enterprise SaaS auth separate (already true via host-scoped cookies + dual Supabase). Marketing app must not embed dashboard session logic or org admin UI.

### Backend

Do not fork business logic. Front ends call shared APIs (`/api/v1`, enterprise service role paths, catalog RPCs). Do not modify `obelisk-core` schemas merely to split repos.

---

## 4. BRAND TAN CONFIRMATION (SaaS)

Canonical SaaS / editorial tokens live in `app/shared/intertexe-editorial.css` and are mirrored on platform:

| Token | Hex | Role |
|-------|-----|------|
| `--itx-gold` / `--platform-gold` | **`#c9a962`** | Primary gold highlight |
| `--itx-accent` / `--platform-accent` | **`#c4a574`** | Bronze/tan accent |
| `--itx-accent-soft` | **`#e8dcc8`** | Soft tan fill |
| `--itx-accent-muted` | **`#d9c9a8`** | Hover / muted tan |
| `--itx-highlight` | **`#f0ebe3`** | Warm highlight surface |

Login page (`app/dashboard/login/login.css`) after the iPhone fix:

| Usage | Hex used | Match? |
|-------|----------|--------|
| Soft panel / CTA fill | `#f3f0ea` (`--ent-login-accent-soft`) | **Close but not canonical** — prefer `#e8dcc8` or `#f0ebe3` |
| Desktop brand gradient | `#e8dcc8` family | Matches `--itx-accent-soft` |
| Focus ring | `#c9a962` | Matches `--itx-gold` ✓ |
| Borders | `#e8e6e1` | Cooler than `--itx-border` `#e8e0d4` — acceptable for white canvas |

**Verdict:** Gold `#c9a962` and accent `#c4a574` are the branded SaaS tans. Login’s white-canvas accents should use `#e8dcc8` / `#f0ebe3` / `#c9a962` rather than inventing `#f3f0ea` as a third soft tan. Page background `#FFFFFF` with tan **only** on highlights is correct for the login surface.

---

## 5. WHAT WOULD MOVE (when splitting)

### Into `intertexe-enterprise` (marketing)

- `app/platform/**` (pages, CSS, b2b-visuals, demo UI)
- Related public assets under `public/platform/**`
- Marketing lead APIs that are marketing-only (`app/api/platform/*`, leads intent helpers) — **or** keep leads on shared API and call from marketing
- Platform analytics helpers used only by marketing
- Tests: `scripts/platform-*.test.ts`, `scripts/pricing-modules.test.ts` (marketing assertions)

### Into `intertexe-platform` (authenticated SaaS)

- `app/dashboard/**` (login, org app, HQ)
- `lib/enterprise/**`, `lib/dashboard/**` (except pure URL helpers that marketing needs)
- Enterprise theme CSS, passport designer (admin), billing/SSO server routes under `/api/dashboard/*`
- `enterprise/` Supabase config

### Stay on `intertexe-web` (consumer)

- Consumer `app/` routes outside `platform` / `dashboard` / extension bridges
- Consumer `lib/catalog-*`, consumer auth, Meta pixel for consumer funnels
- `app/brands` redirect (until intentionally remapped)

### Shared / edge cases

| Asset | Recommendation |
|-------|----------------|
| `app/p/**` public passports | Prefer thin public app or web edge calling obelisk APIs; do not bury inside marketing |
| `app/shared/intertexe-editorial.css` | Extract to tiny `@intertexe/brand` package |
| `lib/platform-urls.ts` | Publish tiny shared config package or duplicate 20-line helper |
| `middleware.ts` host map | Each app gets its own slim middleware |
| Crons in `vercel.json` | Move with the app that owns the job (mostly web/HQ) |

### Extension / iOS

- Extract `chrome-web-store/` → `intertexe-extension` when packaging independence matters; update download URLs only.
- Do not touch iOS unless AASA or API contracts change.

---

## 6. VERCEL / ENV / SUPABASE / SEO IMPLICATIONS

### Vercel

Today: **one project**, multi-domain. After split:

- `intertexe-web` → `intertexe.com` / `www`
- `intertexe-enterprise` → rewritten under `www/brands` **or** temporary `www/platform` until cutover
- `intertexe-platform` → `platform.intertexe.com`

Use Vercel rewrites/multi-project path routing so `/platform` (and later `/brands`) on www can proxy the marketing deploy **without** changing public URLs mid-flight.

### Environment variables

| Concern | Action |
|---------|--------|
| Marketing | Needs `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PLATFORM_APP_URL`, Meta/GA if used on sales pages, lead POST endpoint |
| Platform SaaS | Needs `ENTERPRISE_SUPABASE_*`, Paddle, SSO, session secrets — **must not** be present on public marketing deploy |
| Consumer | Keeps catalog Supabase + consumer auth; should not receive enterprise service role |

### Supabase

- No schema changes required for repo separation.
- Marketing should not get `ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY`.
- Passports/public JSON already use server resolvers — keep those on platform or a dedicated edge with service role.

### SEO / routing risks

- `/platform` is indexed / linked from demos and CTAs — preserve redirects forever if path changes.
- `/brands` → `/designers` must be migrated with 301 plan and affiliate audit before enterprise claims `/brands`.
- Avoid duplicate live copies of the same marketing pages on two deploys.

---

## 7. MIGRATION RISK LIST

| Risk | Severity | Mitigation |
|------|----------|------------|
| Claiming `/brands` breaks designer affiliate links | High | Inventory referrers; introduce `/for-brands` or keep `/platform` until clear |
| Dual live marketing copies | High | Single canonical deploy; rewrite, don’t duplicate |
| Leaking enterprise service role to marketing | Critical | Separate Vercel envs; scan secrets |
| Cookie/session breakage on platform host | High | Keep host-scoped cookies; regression test login/SSO |
| Passport `/p/*` 404 after move | High | Move with platform or shared edge first |
| CSS token drift after split | Medium | Tiny brand package first |
| Cron jobs orphaned | Medium | Map each cron to owning project before cutover |
| Accidental monorepo scaffolding | Medium | Explicit decision gate; default = independent repos |

---

## 8. EXACT IMPLEMENTATION PLAN (phased)

### Phase 0 — Safe now (no repo split)

1. Publish this assessment.
2. Align login highlight tans to canonical `#e8dcc8` / `#c9a962` / `#c4a574`.
3. Keep shipping marketing under `/platform`.
4. Inventory inbound links to `/brands` and `/platform`.
5. Decide `/brands` strategy: remapping vs `/for-brands` vs keep `/platform` as public path with nav label “For Brands”.

### Phase 1 — Brand primitives package (optional, small)

1. Create `@intertexe/brand` (colors, type, wordmark SVG) — **only** primitives.
2. Point platform + login + enterprise theme at it.
3. Do **not** move feature components.

### Phase 2 — Extract enterprise marketing app

1. New repo `intertexe-enterprise` seeded from `app/platform/**` + assets + tests.
2. Visual snapshot parity vs current `/platform`.
3. Vercel rewrite: `www/platform/*` → marketing project (or reverse proxy).
4. Delete marketing pages from main app **only after** rewrite verified (no dual versions).
5. Leave SaaS modules inside platform app.

### Phase 3 — Extract authenticated platform

1. New repo `intertexe-platform` from `app/dashboard/**` + enterprise libs + APIs.
2. Keep `platform.intertexe.com` DNS on that project.
3. Verify login, SSO, org isolation, billing.

### Phase 4 — Extension extract (optional)

1. Move `chrome-web-store/` to `intertexe-extension`.
2. Update zip/download + store listing pipelines.

### Phase 5 — Only then resume large visual redesigns

Prefer redesigning inside the owning deployable so consumer/SaaS aren’t blocked.

---

## 9. DECISION FOR THIS CYCLE

**Do not split repositories in this change set.**

Rationale: `/brands` conflict, single-project crons/env, passport + middleware coupling, and high dual-version risk mean a split is **possible but not “safe as a drive-by.”** Phase 0 + explicit URL decision comes first.

Next actionable engineering after this doc:

1. Confirm branded tan on login (token alignment).
2. Choose public marketing path strategy (`/platform` vs eventual `/brands`).
3. Only then open a dedicated extraction PR series.
