# intertexe-enterprise (extraction staging)

This folder documents the **target** standalone enterprise marketing app.

Start with [`docs/architecture.md`](../docs/architecture.md) for how marketing, SaaS, consumer, and HQ fit together.

## Phase 1 (current)

Marketing still renders inside the main Next.js app at:

- Canonical: `/brands/*`
- Legacy alias: `/platform/*` (same experience; canonical tags point at `/brands`)

Source UI remains under `app/platform/**` (components/CSS) and is routed via `app/brands/**`.

## Phase 1b (next extraction)

Move `app/platform/**` marketing UI into this package as a Next.js app root, deploy as a separate Vercel project, and rewrite `www.intertexe.com/brands` → that deployment.

Do **not** duplicate live indexed pages during the move.

## Out of scope

- Authenticated SaaS (`platform.intertexe.com` / `app/dashboard`)
- Consumer `/designers` / fashion brand catalog
- `public/brands/*` image assets (consumer fashion brand photography)
