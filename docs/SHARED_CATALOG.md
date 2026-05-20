# Shared Supabase catalog (iOS + web)

Read-only catalog layer on top of `products`. **No deletes, no approval changes, no regional row removal.**

**Scope (this doc):** migrations, views, RPCs, alias config, preview SQL. **Do not change iOS `CatalogQuality` or tighten RPC membership from this layer until explicitly approved.** Website alignment is tracked but not implemented in this repo yet.

**Homepage performance cache (not source of truth):** see `docs/MERCHANDISING_AND_HOMEPAGE_FEEDS.md` — `homepage_feed_items` per `rail_key`, refreshed from this catalog layer.

---

## INTERTEXE canonical merchandising map (source of truth)

These are the **production CMS** collection slugs (`active_merchandising_collections.slug`):

| Canonical slug | Editorial intent (summary) |
|----------------|----------------------------|
| `silk-edit` | Silk Edit / Silk Essentials — silk apparel and silk blends; material truth should exclude “X-only” fibers without silk (future strict phase). |
| `cashmere-edit` | Cashmere apparel; cashmere–wool blends allowed when cashmere is present; exclude wool-only without cashmere (future strict). |
| `linen-essentials` | Linen / flax apparel (future strict). |
| `tailoring-edit` | Structured professional tailoring; wool not required (future silhouette/material rules). |
| `vacation-shop` | Resort / breathable pieces; fiber and negative rules in map (future strict). |
| `city-wardrobe` | Polished urban everyday; exclusions for vacation-only / swim / evening-only (future strict). |

**Operational feeds (same global gates as catalog):**

- **New In / Just In:** newest approved + active women’s apparel (no fiber requirement).
- **Sale:** approved + active women’s apparel where `is_sale` and/or discounted vs `original_price` (thresholds TBD in SQL).

---

## Legacy slug tokens (routing only)

Canonical map aliases (routing `collection_slug` / product `collection_slugs` overlap to a merchandising context):

| Legacy token | Maps to canonical |
|--------------|-------------------|
| `the-silk-edit` | `silk-edit` |
| **`silk-essentials`** | `silk-edit` |
| `the-cashmere-edit` | `cashmere-edit` |
| `vacation-edit` | `vacation-shop` |
| `wool-tailoring` | `tailoring-edit` |
| **`linen-everyday`** | `linen-essentials` |

**Non-canonical legacy (still supported in config, not on the map above):**

- **`silk-occasion`** — extra collection token and optional **legacy lookup** row in `collection_slug_aliases` (migration `20240014`). Treat as **legacy**, not a CMS canonical.
- **`occasion-edit`** — same: **legacy lookup** key only; **not** a production canonical from the INTERTEXE map.

`collection_slug_aliases` stores both **canonical** rows (six slugs) and **legacy lookup** primary keys so `editorial_collection_products('the-silk-edit')` (etc.) still resolves. **`ON CONFLICT DO NOTHING`** — never rewrites product rows.

---

## Global rules (architecture)

The shared stack aims to enforce (fully or partially today):

- Approved + active products only (`live_products`).
- Women’s apparel only + category exclusions (`live_products_apparel`).
- Regional offer rows retained in the database; **visual dedupe** for display surfaces.
- Prefer the user’s region for price/link in deduped RPC output.
- **Material truth priority:** composition + `material_metadata` should beat stale `collection_slugs` / tags / `editorial_categories` when they conflict.

**Today:** slug/blob OR heuristics in `silk_edit_predicate` / `vacation_edit_predicate` are **permissive**; **strict material-truth predicates and RPC membership changes are a later phase** (see preview SQL below). No automatic product repair or approval changes from these migrations.

---

## Layers

| Layer | Object | Purpose |
|-------|--------|---------|
| L0 | `products` | Source of truth (feed sync, editorial writes) |
| L1 | `live_products` | `approved = 'yes'` AND `is_active IS TRUE` |
| L2 | `live_products_apparel` | L1 + women’s apparel gate |
| L3 | `catalog_list` RPC | L2 + visual dedupe + regional winner (`price`, `url`, `currency`, `region`) |
| L4 | `editorial_collection_products`, `silk_edit_products`, `vacation_edit_products` | Editorial collections on L2 + dedupe |

---

## Migrations (repo)

| File | Creates / does |
|------|----------------|
| `20240006_live_products_view.sql` | `live_products` (apply first if not live) |
| `20240008_live_products_apparel.sql` | `live_products_apparel` |
| `20240009_catalog_helper_functions.sql` | Dedupe keys, region rank, permissive `silk_edit_predicate` / `vacation_edit_predicate`, `editorial_sort_score` |
| `20240010_collection_slug_aliases.sql` | Table + **CMS canonical** alias rows |
| `20240014_collection_slug_aliases_legacy_lookup_keys.sql` | **Legacy lookup** alias rows (idempotent `INSERT … ON CONFLICT DO NOTHING`) |
| `20240015_collection_slug_aliases_map_tokens.sql` | **Idempotent merges** for `silk-essentials` / `linen-everyday` on DBs that already ran older `20240010`/`20240014` |
| `20240011_catalog_list_rpc.sql` | `catalog_list`, `catalog_list_count`, `catalog_product_for_region` |
| `20240012_editorial_collection_rpc.sql` | `editorial_collection_products`, `silk_edit_products`, `vacation_edit_products` |
| `20240013_editorial_rpc_slug_ambiguity_hotfix.sql` | Replace `editorial_collection_products` (`v_collection_slug`; idempotent with latest `20240012`) |

**Do not apply** `20240007_live_products_apparel_gate.sql` — superseded by `20240008` (separate view).

---

## Apply order

1. `20240006` (if not already applied in Supabase)
2. `20240008`
3. `20240009`
4. `20240010`
5. `20240014`
6. `20240015` (safe no-op if aliases already merged on fresh installs)
7. `20240011`
8. `20240012`
9. `20240013` (if needed for drift / older `20240012` body)
10. Run `scripts/catalog_stabilization/06_shared_catalog_preview.sql`
11. Optionally run `scripts/catalog_stabilization/08_material_truth_predicate_preview.sql` for permissive vs **draft** strict counts
12. **Wait for approval** before website PR, production apply, and before any iOS RPC cutover

---

## Region parameters

| Client | `p_preferred_region` |
|--------|----------------------|
| iOS `SupabaseManager.userRegion()` | `us` \| `uk` \| `eu` |
| Web shop `us-ca` | `us` |
| Web shop `eu-uk-me` | `uk` (fallback `us` via `p_fallback_region`) |

Dedupe picks one **display** row per visual group; all regional rows remain in `products` / `live_products` / `live_products_apparel`.

---

## RPC quick reference

```sql
SELECT * FROM catalog_list('us', 'us', 'silk', NULL, NULL, NULL, 80, 60, 0);
SELECT * FROM catalog_product_for_region(p_id := '…'::uuid, p_preferred_region := 'uk');
SELECT * FROM silk_edit_products('us', 96);
SELECT * FROM vacation_edit_products('uk', 96);
SELECT * FROM editorial_collection_products('cashmere-edit', 'us', 96);
```

**New In** and **Sale** are documented here for product/merch alignment; dedicated RPCs are **not** implemented in the current migration set (preview SQL sketches filters only).

---

## iOS (explicitly deferred)

| Today | After approval |
|-------|----------------|
| `live_products` + **unchanged** `CatalogQuality` | Optionally call `CatalogRPC` / shared RPCs |

---

## Web (explicitly deferred)

Replace consumer `.from('products')` with `catalog_list` or `live_products_apparel` + region. Tracked separately in the website repo.

---

## Safety

- Baseline preview: `scripts/catalog_stabilization/06_shared_catalog_preview.sql`
- Permissive vs **draft** strict material-truth counts: `scripts/catalog_stabilization/08_material_truth_predicate_preview.sql` (read-only; **not** production predicates)
- Rollback: `scripts/catalog_stabilization/07_shared_catalog_rollback_notes.md`
- Operational rules: `SAFETY_NOTES.md`
- Metadata repair: `scripts/catalog_stabilization/04_metadata_repair_apply.sql` — **not** part of this set; **do not** run without approval

---

## Prerequisites

- `active_merchandising_collections` must exist in Supabase (CMS pins / rules).
- PostgREST exposes RPCs (`GRANT EXECUTE` in migrations).
