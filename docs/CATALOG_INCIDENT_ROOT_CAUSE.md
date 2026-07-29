# Catalog incident root cause (2026-07-27)

Validated from code, migrations, emergency restore scripts, and workflow comments.
Items that still need log/GHA run IDs for a courtroom-grade audit are marked **OPEN**.

## What happened

On **2026-07-27**, the live customer-facing catalog was severely reduced. Metadata-only
`system_status.catalog_last_known_good` counts were **insufficient to restore** the prior
state. Emergency restore required direct Postgres (`scripts/p0-emergency-catalog-restore.mjs`)
re-activating products and rebuilding displayable indexes while temporarily disabling
`trg_products_is_displayable` / `trg_update_is_displayable`.

## Verified sequence

1. **Authoritative sync path** was GitHub Actions `rakuten-feed-sync.yml` →
   `scripts/run-rakuten-feed-chunk.mjs` → `runRakutenFeedChunk()` → `syncRakutenFeeds()`.
2. **Live table written:** `products` (direct upsert from feed; no staging table).
3. **Deactivation path:** soft `UPDATE products SET is_active = false` via
   `markInactiveProducts()` in `lib/feed-sync/rakuten-sync.js` (when env-gated and cycle-complete).
4. **Displayability:** `is_displayable` is maintained by DB triggers
   (`trg_products_is_displayable`, `trg_update_is_displayable`). Soft-deactivating `is_active`
   cascades into non-displayable live views (`live_products` / `live_products_apparel`).
5. **CURATED_FIELDS** already prevented feed upserts from overwriting `approved` /
   `is_active` / `is_displayable` on *existing* rows — but markInactive and triggers still
   could shrink the live catalog.
6. **After the incident**, migration `20260727_catalog_product_snapshots.sql` added
   row-level snapshot tables. Comment in migration: *"Metadata-only counts are NOT enough
   (incident 2026-07-27)."*
7. **Nightly schedule was disabled** in `.github/workflows/rakuten-feed-sync.yml`
   (`# P0 2026-07-27: schedule disabled until staging→validate→promote pipeline ships`).

## Confirmed failure modes addressed by this release

| Mode | Evidence | Mitigation in this release |
|---|---|---|
| Incomplete cycle treated as complete for inactive | Cycle-complete gate exists but feed can still shrink live via other paths | Staging → validate → promote; no live markInactive without healthy cycle + gates |
| Metadata-only LKG | `catalog_last_known_good` stores counts only; restore scripts guess by `updated_at` | Row-level `catalog_product_snapshots` + `catalog_product_snapshot_rows` writers + restore |
| Trigger cascade on `is_active` | Emergency restore disables displayable triggers | Promote smoke tests + auto-rollback; keep soft-only |
| Global % can mask merchant wipe | Only global 5% drop guard | Merchant + category gates |
| Counts look fine, UX broken | No post-change smoke | Post-promote HTTP smoke + health score |

## OPEN (require production log pull)

- Exact GHA run ID / timestamp of the destructive run.
- Exact product/displayable counts immediately before and after.
- Whether `CATALOG_ALLOW_MARK_INACTIVE=1` / `RAKUTEN_MARK_INACTIVE_ON_CYCLE=true` were set.
- Whether a malformed or empty FTP listing advanced the checkpoint incorrectly.

Do not close P0 without attaching those log artifacts to this document.

## Architectural principle

A feed update may propose a new catalog. It must never directly destroy the catalog
customers are currently using.
