# INTERTEXE merchandising architecture + homepage feed cache

**Status:** Plan + migration draft (`20240016`). **Not applied to production.**

Feed tables are a **performance/cache layer only**. They do **not** replace the final merchandising system.

---

## Source of truth (unchanged)

| Layer | Role |
|-------|------|
| `products` | Writable catalog (feed sync, editorial scripts) |
| `live_products` | Approved + active consumer surface |
| `live_products_apparel` | Women’s apparel gate (view-only) |
| `collection_slug_aliases` + `editorial_collection_products` RPC | Canonical collection membership |
| `catalog_list` / `catalog_list_count` RPCs | Shared deduped catalog reads (`docs/SHARED_CATALOG.md`) |
| Future merchandising rules | Material truth, collection predicates, CMS slugs |

**Homepage feed tables never override approvals, slugs, or product rows.**

---

## Final merchandising tree (navigation)

```
Top level
├── New In
├── Fabrics
│   ├── Silk
│   ├── Linen
│   ├── Cashmere
│   ├── Wool
│   ├── Cotton
│   └── Leather & Suede
├── Collections
│   ├── Vacation
│   ├── Evening
│   ├── Tailoring
│   ├── Summer in the City
│   └── The White Edit
├── Designers
└── Sale
```

### Mapping: nav → `rail_key` → canonical slug (where applicable)

| Nav | `rail_key` | Canonical / rule source (truth) | Phase 1 cache |
|-----|------------|----------------------------------|---------------|
| New In | `top:new_in` | Newest `live_products_apparel` (brand allowlist) | **Enabled** |
| Fabrics → Silk | `fabrics:silk` | Fiber + apparel rules → future `silk-edit` RPC | **Enabled** (pool fiber split) |
| Fabrics → Linen | `fabrics:linen` | → `linen-essentials` | **Enabled** |
| Fabrics → Cashmere | `fabrics:cashmere` | → `cashmere-edit` | **Enabled** |
| Fabrics → Wool | `fabrics:wool` | TBD material truth | Disabled (empty cache OK) |
| Fabrics → Cotton | `fabrics:cotton` | TBD | Disabled |
| Fabrics → Leather & Suede | `fabrics:leather-suede` | Excluded from natural-fiber rails today | Disabled |
| Collections → Vacation | `collections:vacation` | → `vacation-shop` | **Enabled** (pool vacation split) |
| Collections → Evening | `collections:evening` | TBD / legacy `silk-occasion` | Disabled |
| Collections → Tailoring | `collections:tailoring` | → `tailoring-edit` | Disabled |
| Collections → Summer in the City | `collections:summer-in-the-city` | → `city-wardrobe` (alias TBD) | Disabled |
| Collections → The White Edit | `collections:white-edit` | TBD CMS slug | Disabled |
| Designers | `designers:curated` | `designers` table + curated slugs (not product rows) | **Separate path** (no `homepage_feed_items`) |
| Sale | `sale:all` | `is_sale` + apparel gate | **Enabled** |

`rail_key` format: `{axis}:{slug}` — stable across web, iOS, and refresh jobs.

---

## Cache layer (performance only)

### Tables (migration `20240016`)

| Object | Purpose |
|--------|---------|
| `homepage_merch_rails` | **Registry** of all rails (enabled flag, max items, refresh strategy, canonical slug pointer) |
| `homepage_feed_items` | **Unified** precomputed product rows per `rail_key` |
| `homepage_feed_meta` | Per-rail refresh audit (+ `global`) |

**Not source of truth:** rows are disposable. `TRUNCATE` + refresh restores from catalog.

### Read path (website / iOS)

```
SSR / app home
  → SELECT * FROM homepage_feed_items WHERE rail_key = $1 ORDER BY rank LIMIT $max
  → (optional) read homepage_feed_meta.refreshed_at for stale UI
  → NEVER query live_products_apparel on homepage hot path after cutover
```

`/shop`, materials hubs, collection pages: **still** `catalog_list` / `live_products_apparel` / editorial RPCs.

### Write path (offline only)

```
cron / manual
  → SELECT refresh_homepage_feeds()
  → reads homepage_merch_rails (enabled)
  → builds bounded pool from live_products_apparel (or future: editorial_collection_products per canonical_slug)
  → applies shared dedupe (catalog_dedupe_key) + diversify rules
  → DELETE + INSERT homepage_feed_items for that rail_key
  → updates homepage_feed_meta
```

---

## Refresh strategies (extensible)

| Strategy | Used for | Source of truth today | Future source |
|----------|----------|----------------------|---------------|
| `new_in_brands` | `top:new_in` | Brand allowlist + `created_at` on `live_products_apparel` | Same + merchandising caps |
| `brand_pool_fiber` | `fabrics:*` | Bounded brand pool; `composition` contains fiber slug | `editorial_collection_products('silk-edit')` etc. |
| `brand_pool_vacation` | `collections:vacation` | Pool rows matching linen/cotton/silk in composition | `editorial_collection_products('vacation-shop')` |
| `sale_flag` | `sale:all` | `is_sale` on apparel surface | + discount vs `original_price` rules |
| `collection_canonical` | `collections:*` (later) | — | `editorial_collection_products(p_slug)` |
| `designers_curated` | `designers:curated` | `designers` by slug | Same; optional `homepage_designer_items` table later |

Phase 1 uses pool strategies where RPC/editorial paths are still IO-heavy. Phase 2 swaps strategy per rail in **registry only** (no nav rename).

---

## Legacy homepage table names → `rail_key`

For the current website (`lib/homepage-data.ts`) cutover:

| Legacy field | `rail_key` |
|--------------|------------|
| `newInProducts` | `top:new_in` |
| `silkProducts` | `fabrics:silk` |
| `linenProducts` | `fabrics:linen` |
| `cashmereProducts` | `fabrics:cashmere` |
| `vacationProducts` | `collections:vacation` |
| `saleProducts` | `sale:all` |
| `curatedDesigners` | `designers:curated` (not in `homepage_feed_items`) |

---

## iOS reuse (later)

- Same `rail_key` contract: `GET homepage_feed_items?rail_key=eq.fabrics:silk&order=rank`.
- Designers rail: continue `designers` / curated slugs until `homepage_designer_items` exists.
- Shop tab: unchanged (`live_products` / shared RPCs).

---

## Rollout (no production execution in this doc)

1. Apply `20240016` in **staging** only.
2. `SELECT refresh_homepage_feeds();` — verify enabled rails non-zero.
3. Website: `HOMEPAGE_USE_FEED_CACHE=1`, map `rail_key` → existing props (no UI change).
4. Cron every 15m + optional post–feed-sync delay.
5. Phase 2: enable `collections:tailoring`, flip `fabrics:silk` to `collection_canonical` per rail in registry.

---

## Rollback

1. App flag off → read `live_products_apparel` again.
2. Stop cron.
3. `DROP` feed tables + `refresh_homepage_feeds` (see migration footer).
4. Keep `products` indexes (help `/shop`).

---

## What this does **not** do

- Does not replace CMS / merchandising map in `SHARED_CATALOG.md`
- Does not mutate `products` or approvals
- Does not hardcode only six homepage sections forever (registry holds full tree)
- Does not change UI layout or iOS in this phase
