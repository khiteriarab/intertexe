# Catalog Taxonomy — QA & Deploy Gate

**Do not deploy** until all gates below pass.

## Review methodology (corrected)

| Layer | Script | Role |
|-------|--------|------|
| **Primary** | `scripts/taxonomy-card-review.mjs` | 50 **distinct customer-facing cards** per active node (≥50 catalog); **full card review** when &lt;50. Artifact includes image, title, retailer category, garment type, assignment source, assigned node, `reviewerDecision` (starts `pending`). |
| **Secondary** | `scripts/taxonomy-heuristic-check.mjs` | Automated cross-check only — **not** manual sign-off. |

Prior `taxonomy-precision-report.json` and early “independent audit” both used inference/heuristics, not human review.

```bash
node --env-file=.env.development.local scripts/taxonomy-card-review.mjs
node --env-file=.env.development.local scripts/taxonomy-heuristic-check.mjs
node --env-file=.env.development.local scripts/taxonomy-production-perf.mjs
```

Outputs: `scripts/taxonomy-card-review-report.json`, `scripts/taxonomy-card-review.html`

## Activation policy

- **Shirts** and **Tanks** remain `is_active=false` until leaf precision improves on distinct-card review.
- **Tops** parent: direct high-confidence `clothing/tops` assignments **plus** active descendants (blouses; t-shirts when activated).
- **T-shirts** leaf added (`clothing/t-shirts`, inactive) — inference routes tees out of shirts.
- Parent browse: `catalog_taxonomy_filter_slugs()` = parent slug ∪ active descendants (deduped).

## Navigation kill switch (default OFF — do not enable)

| Layer | Control |
|-------|---------|
| Web hub | `NEXT_PUBLIC_CATALOG_TAXONOMY_NAV=0` (default) |
| Remote API | `GET /api/catalog/taxonomy-config` → `taxonomyNavEnabled: false` |
| iOS | `CatalogTaxonomyRemoteConfig` fetches API; `CatalogTaxonomyFlags.navEnabled` false unless remote explicitly true. DEBUG: UserDefaults `catalogTaxonomyNavEnabled`. |

Open review UI locally: `scripts/taxonomy-card-review.html` (Correct / Incorrect / Unsure, progress, export JSON).

## Pre-deploy checklist

- [ ] Distinct-card review signed off (`reviewerDecision` ≠ pending for sampled nodes)
- [ ] Heuristic secondary check reviewed (no blocking surprises)
- [ ] `taxonomy-production-perf.mjs` ≤2.5s per RPC/route on production
- [ ] Production 404 for deactivated slugs (not dev HTTP 200 quirk)
- [ ] iOS Simulator + TestFlight: taxonomy grid, refinement drawer, Clear All, sort, back nav, deep links, exact VIEW N
- [ ] Deploy with **nav flag off**; verify production counts/filters/latency
- [ ] iOS against production `/api/catalog/taxonomy` + browse RPCs
- [ ] Enable `CATALOG_TAXONOMY_NAV` / iOS flag for Shop hub links

## Deploy sequence (when ready)

1. Ship web taxonomy routes + `/api/catalog/taxonomy` with `CATALOG_TAXONOMY_NAV=0`
2. Apply pending Supabase migrations on consumer HQ
3. Run production perf + 404 verification
4. TestFlight iOS against production API
5. Enable nav flag web + iOS
