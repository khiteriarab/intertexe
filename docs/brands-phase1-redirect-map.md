# Phase 1 — proposed redirect & route map

**Status:** proposed before cutover. Do not treat `/platform` → `/brands` permanent redirects as live until verification is complete.

## Audience split (non-negotiable)

| Path | Audience | Behavior |
|------|----------|----------|
| `/designers`, `/designers/[slug]` | Consumer discovery | **Unchanged.** Never redirects to `/brands`. |
| `/brands` (marketing) | Enterprise B2B | New canonical marketing home. |
| `/brands/*.jpg` (and other static extensions) | Consumer assets | Remains `public/brands/*` image CDN paths. Not marketing pages. |
| `platform.intertexe.com` | Authenticated SaaS | Out of scope for Phase 1. |

## Inventory of existing `/brands` usage

| Kind | Location | Action |
|------|----------|--------|
| Route redirect | `app/brands/page.tsx` → `/designers` | **Retire.** Replace with enterprise marketing home. |
| Static assets | `public/brands/*.{jpg,png,webp}` | **Keep.** Served as `/brands/ganni.jpg` etc. Does not collide with extensionless App Router paths. |
| Image maps | `lib/brand-hero-images.ts`, `lib/editorial-assets.ts`, `lib/rewards.ts`, `lib/designers-directory-nav.ts` | **Keep** asset URLs. |
| Consumer deep links | `app/matches/...`, `app/inspirations/...` use `/brands/${slug}` | **Fix** → `/designers/${slug}` (those routes never existed as pages). |
| Sitemap | Lists `/designers`, not `/brands` | After cutover, add `/brands/*` marketing URLs; never remove `/designers`. |
| Middleware / vercel.json | No `/brands` rules | Add nothing that sends `/designers` ↔ `/brands`. |
| HQ route | `/dashboard/brands` | Unrelated SaaS path — leave alone. |

## Canonical enterprise marketing routes (target)

| Canonical URL | Source of truth (today) | Notes |
|---------------|-------------------------|-------|
| `/brands` | `app/platform/page.tsx` | Enterprise marketing homepage |
| `/brands/solutions` | `app/platform/solutions/page.tsx` | Overview grid |
| `/brands/pricing` | `app/platform/pricing/page.tsx` | |
| `/brands/demo` | `app/platform/demo/page.tsx` | Primary “See it live” |
| `/brands/see-it-live` | → `/brands/demo` | Alias (308/301) |
| `/brands/request` | `app/platform/request/page.tsx` | Demo / lead form |
| `/brands/product-intelligence` | New thin page from solutions card `product-intelligence` | |
| `/brands/traceability` | New thin page from solutions card `traceability` | |
| `/brands/environmental-intelligence` | New thin page from solutions card `environmental` | |
| `/brands/digital-product-passport` | New thin page from solutions card `passport` | |
| `/brands/supplier-data` | New thin page from solutions card `supplier` | |
| `/brands/login` | → `platform.intertexe.com` login | Same as today’s `/platform/login` |

## Legacy `/platform` alias policy

**Phase 1 (this change set):**

| From | Behavior | Canonical `<link>` |
|------|----------|-------------------|
| `/platform` | Serves same marketing experience (rewrite/shared render) | `https://www.intertexe.com/brands` |
| `/platform/solutions` | Same | `.../brands/solutions` |
| `/platform/pricing` | Same | `.../brands/pricing` |
| `/platform/demo` | Same | `.../brands/demo` |
| `/platform/request` | Same | `.../brands/request` |
| `/platform/login` | Redirect to enterprise login host | n/a |

**After verification (follow-up, not automatic in Phase 1):**

| From | To | Code |
|------|----|------|
| `/platform` | `/brands` | **301** |
| `/platform/solutions` | `/brands/solutions` | **301** |
| `/platform/pricing` | `/brands/pricing` | **301** |
| `/platform/demo` | `/brands/demo` | **301** |
| `/platform/request` | `/brands/request` | **301** |
| `/platform/login` | enterprise login URL | **302/307** (unchanged intent) |

Only one indexed set: **`/brands/...`**. `/platform/...` must not be independently indexed once cutover completes.

## Explicit non-redirects

| Path | Must NOT do |
|------|-------------|
| `/designers` | Never redirect to `/brands` |
| `/brands` | Never redirect to `/designers` |
| `/brands/ganni.jpg` (etc.) | Never capture as marketing route |
| `/dashboard/brands` | Never remap to marketing |

## SEO notes

- During Phase 1 dual-path window: identical body OK; **canonical always `/brands/...`**.
- Sitemap: add `/brands` tree; keep `/designers` tree.
- Affiliate/legacy expectation of `/brands` → designers is retired; consumer designer URLs remain `/designers`.
