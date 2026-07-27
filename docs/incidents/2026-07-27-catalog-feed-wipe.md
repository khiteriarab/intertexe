# Incident Report: Overnight Catalog Wipe / Unreliable Shopping Surface

**Status:** Customer-facing damage contained. Incident **not fully resolved** until sync-safety is deployed, catch-up completes (past 12/165), and one overnight sync succeeds without abnormal catalog loss.

**Date:** 2026-07-26 → 2026-07-27  
**Severity:** Critical (catalog trust / shoppability)  
**Surfaces:** Clothing browse, price-low sort, PDP composition, recommendations, Rakuten feed sync

---

## Exact root cause

Stacked failure — not a single DELETE:

1. **Rakuten chunk OOM** on oversized merchant XML (`50739_4668007_mp.xml.gz`, Fleur Du Mal) exhausted GitHub-hosted runner memory. Checkpoint stuck near **11–12 / 165**.
2. **Incomplete / partial feed cycles** could re-upsert existing rows and overwrite live `approved` / `is_active` / displayability, amplifying “empty” or lingerie-flooded surfaces.
3. **Destructive deactivation paths** (`markInactive`, uncapped sold-out deactivation) could shrink the live catalog after incomplete cycles without a drop guard.
4. **Browse RPC bug** in `catalog_browse_page_v2`: for unfiltered clothing (`needs_combo = false`), the hot path hardcoded `ORDER BY created_at DESC`, **ignoring `price_asc`**. Shoppers saw random “price low→high” order (`path_mode: products`).
5. **Composition trust gap**: `is_displayable` historically did not always require composition; PDP iOS hydration used currency filtering (`forWishlist: false`) so UK Peachy Den (`100% cotton` in DB) could hydrate blank for US shoppers.

**Rule violated:** A broken feed delayed (and distorted) the store; it must never erase or silently downgrade the existing catalog.

---

## Timeline (UTC / local)

| When | Event |
|------|--------|
| Overnight / early Jul 27 | Feed chunk OOM; checkpoint stuck ~11–12/165; clothing surface flooded / felt empty |
| Morning Jul 27 | Ops: skip OOM file, demote FDM lingerie mis-tags, advance checkpoint to 12 |
| Midday Jul 27 | Live verify: price-low broken (`path_mode: products`); Peachy composition present in DB |
| Afternoon Jul 27 | Applied SQL: `catalog_browse_price_page_ids`, patched `catalog_browse_page_v2`, composition gate on trigger + browse |
| Afternoon Jul 27 | Classify batches restored ~**19,200** classified/displayable sample health |
| Afternoon Jul 27 | Sync-safety code written locally; rollback dry-run OK; **not yet deployed** |

---

## Estimated catalog impact

- Overnight: large apparent catalog loss / brand flood (FDM lingerie as clothing); monitor once reported near-empty / `displayable: 0` (monitor also buggy).
- Recovery: ~**19,200** products classified in restore batches; multi-brand clothing browse restored after FDM demotion.
- Exact peak % drop not fully reconstructed from a perfect pre-incident snapshot; post-fix `catalog_last_known_good` was written for future guards.

---

## Code paths changed

### Website (`intertexe`)
- `lib/feed-sync/rakuten-sync.js` — curated-field preserve (`approved`, `is_active`, `is_displayable`), 21-day grace, 5% drop abort, deactivation caps, `catalog_sync_runs` audit
- `scripts/run-rakuten-feed-chunk.mjs` — sync lock (existing; required before catch-up)
- `scripts/qa-price-sort-composition.mjs` — live regression checks
- `scripts/rollback-catalog-from-snapshot.mjs` — restore from `catalog_last_known_good`

### Database (applied live; migrations in `intertexe-ios`)
- `supabase/migrations/20260727_catalog_price_sort_and_composition_gate.sql`
- `supabase/migrations/20260727_catalog_sync_runs_audit.sql`
- Hotpath note in `20260720_catalog_browse_latency_hotpaths.sql`

### iOS (`intertexe-ios`)
- `ProductDetailView.swift` — hydrate with `forWishlist: true` + merge-preserve composition/NFP
- `WomensCatalogGuard.swift` — hard exclude blank composition
- `SupabaseManager.swift` — recommendation gates for blank composition + sold-out

---

## Safeguards added

| Safeguard | Mechanism |
|-----------|-----------|
| Additive upserts | Existing rows skip overwrite of curated/approval/active fields |
| 5% drop abort | `markInactive` aborts + sets `catalog_publish_blocked` |
| 21-day grace | Missing products not inactivated until `last_seen_at` older than grace |
| Deactivation caps | `RAKUTEN_INACTIVE_MAX_PER_RUN` (500), `RAKUTEN_MAX_DEACTIVATE_PER_RUN` (2000) |
| Sync lock | `rakuten_feed_sync_lock` in chunk runner |
| Audit log | `catalog_sync_runs` table |
| Snapshot | `catalog_last_known_good` before mass inactive |
| Price sort | `products_price_global` + `catalog_browse_price_page_ids`; exclude price ≤ 0 |
| Composition gate | Trigger + browse `base_where` + price helper require composition |
| Never DELETE | Soft `is_active = false` only |

---

## Live verification results (Jul 27)

- Clothing `price_asc` → `path_mode: products_price_global`, monotonic prices, blank composition count **0**
- Page 2 continues ascending from page 1
- Web `/api/catalog?category=clothing&sort=price_asc` sorted correctly
- Peachy Den Joan Indigo Rinse: `composition = 100% cotton`, displayable (UK)
- Rollback script dry-run: snapshot found; `--apply` not exercised on mass restore

---

## Remaining risks

1. Sync-safety JS **must be on production** before any aggressive feed restart.
2. Feed still **12/165** — catalog not fully restored from merchant catch-up.
3. Legacy blank-composition `is_displayable` rows may still exist in DB (browse filters them).
4. Staging → validation → promote pipeline **not built**.
5. iOS App Store build not yet shipping hydration/recommendation gates.
6. Overnight sync not yet proven clean under new guards.

---

## Rollback procedure

```bash
# Dry-run
node scripts/rollback-catalog-from-snapshot.mjs

# Apply (capped reactivate of post-snapshot inactive rows with composition)
node scripts/rollback-catalog-from-snapshot.mjs --apply
```

Uses `system_status.catalog_last_known_good`. If publish was blocked, clears `catalog_publish_blocked` after apply.

SQL emergency: re-apply last known good RPC migration from `20260727_catalog_price_sort_and_composition_gate.sql` via Supabase Management API / SQL editor.

---

## Definition of done (not met yet)

- [x] Customer browse price-low + composition gate live
- [ ] Website sync-safety **deployed**
- [ ] Feed catch-up complete past 12/165
- [ ] One full overnight sync with no abnormal catalog loss
- [ ] Rollback `--apply` exercised in a controlled drill (optional but recommended)
- [ ] iOS App Store release with PDP hydration fix
