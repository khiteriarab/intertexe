# Catalog normalization rollout (phased — no cutover until reviewed)

**Status:** Phase 0 only (read-only audits + additive planning).  
**Blocked until:** Disk IO stable, Vercel/homepage verified, iOS TestFlight shipped (current ops priorities).

---

## Architectural rules (locked)

| Layer | Role | Mutability |
|-------|------|------------|
| `products` | Raw source truth (regional **offers**) | Feed upsert only; **no deletes**; curated fields preserved on conflict |
| `canonical_products` | One true garment/style | **Derived**, additive |
| `product_material_facts` | Normalized material truth | **Derived**, rebuildable |
| `product_rail_membership` | Merchandising truth (rail_key) | **Derived**, rebuildable |
| `homepage_feed_items` | Presentation/cache | Disposable; refresh from membership when ready |

**Regional variants = offers, not duplicates to delete.**

---

## Rollout order (no massive one-shot)

| Phase | Name | Production impact | Writes? |
|-------|------|-------------------|---------|
| **0** | Read-only audits | None | No |
| **1** | Additive DDL | Brief lock on new tables only | DDL only (`canonical_*`, nullable FK) |
| **2** | Safe backfill | Batched IO; off-peak | `canonical_id` + `canonical_products` rows only |
| **3** | Shadow verification | Read-only compares | No consumer cutover |
| **4** | Compare vs current rails | Diff cache vs membership | Optional cache refresh in staging |
| **5** | Gradual cutover | One surface at a time | App/env flags |
| **6** | Legacy removal | After parity | Deprecate paths only when proven |

**No hard-cut** of production reads to canonical tables until phase 5 sign-off.

---

## Migration sequence (when approved — not now)

Apply **one file per maintenance window**, never all at once.

```
1. supabase/proposed/20240019_catalog_canonical_layer_DRAFT.sql
   → tables + nullable products.canonical_id + views (no backfill)

2. supabase/proposed/20240020_catalog_material_facts_DRAFT.sql   (future)
   → product_material_facts + parse function (no membership yet)

3. supabase/proposed/20240021_catalog_rail_membership_DRAFT.sql  (future)
   → product_rail_membership + rebuild function (offline)

4. supabase/proposed/20240022_refresh_homepage_feeds_v3_DRAFT.sql (future)
   → cache refresh reads membership; old refresh remains callable
```

Between each step: run shadow SQL (section below) and compare counts.

---

## Backfill strategy (safe, batched)

**Not a single transaction.**

1. **Preview** — `audit_catalog_normalization_preview.sql` + `02_shadow_parity.sql`
2. **Batch size** — 2,000–5,000 `live_products_apparel` rows per run (tune to IO)
3. **Insert** `canonical_products` — `INSERT … ON CONFLICT (style_key) DO NOTHING`
4. **Link** — `UPDATE products SET canonical_id = … WHERE id IN (…)` only where `canonical_id IS NULL`
5. **Rebuild facts** — `TRUNCATE product_material_facts; INSERT …` from composition + `material_metadata`
6. **Rebuild membership** — `TRUNCATE product_rail_membership; INSERT …` from facts + editorial RPCs
7. **Refresh cache** — existing per-rail manual SQL (not full `refresh_homepage_feeds_v2` while IO depleted)

**Never:** `DELETE FROM products`, bulk `approved` / `collection_slugs` / `composition` updates from feed.

---

## Shadow verification (phase 3 — read-only)

Run `supabase/manual/audit_catalog_normalization_02_shadow_parity.sql`.

Compares **without changing** live reads:

| Check | Legacy signal | Shadow signal |
|-------|---------------|---------------|
| Silk rail | `homepage_feed_items` where `rail_key = fabrics:silk` | Composition / material_truth silk |
| Slug conflicts | `collection_slugs` @> silk-edit | No silk in composition |
| Regional offers | Multi-region per `catalog_dedupe_key` | Count preserved (not merged away) |
| Material hub count | `homepage_feed_meta.source_rows` | Distinct canonical in fiber membership (when table exists) |

Acceptance: shadow rail counts within agreed tolerance (e.g. ±15%) before cutover.

---

## Estimated IO impact (planning)

| Operation | Relative load | When |
|-----------|---------------|------|
| Phase 0 audits | Low–medium (1–2 min) | **Now** (one session) |
| DDL phase 1 | Low | Off-peak |
| Backfill canonical (full apparel) | **High** — full scan `live_products_apparel` | Only after Disk IO green |
| Material facts rebuild | Medium | After canonical linked |
| Membership rebuild | Medium–high (editorial RPC per slug) | Off-peak, per slug |
| Full `refresh_homepage_feeds_v2` | **Very high** (5000-row pool) | **Avoid** until IO recovers; use per-rail SQL |
| Per-rail cache refresh | Low–medium | Safe today |

Run `audit_catalog_normalization_03_io_sizing.sql` for row counts used to estimate batch count.

---

## Rollback plan

| Applied through | Rollback |
|-----------------|----------|
| Phase 1 DDL only | `DROP` derived tables; `ALTER products DROP COLUMN canonical_id`; views unchanged |
| Phase 2 backfill | `UPDATE products SET canonical_id = NULL`; `TRUNCATE canonical_products`; no product row loss |
| Phase 3–4 facts/membership | `TRUNCATE product_material_facts`, `product_rail_membership` |
| Phase 5 cutover | Revert env: `HOMEPAGE_USE_FEED_CACHE=1` still reads **old** cache; disable membership-based refresh |
| Cache | `DELETE FROM homepage_feed_items WHERE rail_key = $1` + per-rail refresh from legacy sources |

**Production reads today** stay on `homepage_feed_items` + `catalog_list` fallbacks — rollback is always “stop using new tables,” not restore deleted products.

---

## Gates before any production cutover

- [ ] Audit results pasted (sections 3, 4, 6, 8 from preview SQL)
- [ ] Duplicate cluster counts documented
- [ ] Canonical candidate count vs offer row count ratio agreed
- [ ] Multi-region cluster count confirmed as **retained offers**
- [ ] Slug vs composition conflict rate reviewed
- [ ] Disk IO budget healthy in Supabase dashboard
- [ ] Vercel production visually verified (homepage + `/materials/*`)
- [ ] iOS TestFlight build on `main` @ merchandising commit
- [ ] Shadow parity SQL within tolerance
- [ ] Explicit written approval for phase 1 DDL

---

## Audit files (run in order)

1. `supabase/manual/audit_catalog_normalization_preview.sql` — clusters, canonical preview, slug conflicts  
2. `supabase/manual/audit_catalog_normalization_02_shadow_parity.sql` — rail vs material truth  
3. `supabase/manual/audit_catalog_normalization_03_io_sizing.sql` — batch sizing  

Save all result sets before closing the SQL Editor session.

---

## What we are explicitly not doing now

- Applying `20240019_*` DRAFT to production  
- Running full catalog refresh or normalization backfill  
- Cutting web/iOS reads to `canonical_products`  
- Deleting or merging regional product rows  

Normalization work **continues in repo only** until ops priorities 1–5 are green and gates above are checked.
