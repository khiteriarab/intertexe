# Catalog browse RPC v2 — shared contract (iOS + web)

**Rule:** For the same filter state, iOS and web must return the **same product IDs in the same order** (prefix-equal when page sizes differ).

Source of truth: Postgres RPC `catalog_browse_page_v2`.

Neither client may:

- post-filter the page
- reorder the page
- broaden filters
- invent products
- fall back to legacy browse when filters are present

---

## RPC

```
catalog_browse_page_v2(
  p_region text DEFAULT 'us',
  p_category text DEFAULT NULL,
  p_material_family text DEFAULT NULL,
  p_material_subtype text DEFAULT NULL,
  p_fabric_construction text DEFAULT NULL,
  p_min_nfp int DEFAULT NULL,
  p_max_synthetic int DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_brand_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_include_unverified boolean DEFAULT false,
  p_sort text DEFAULT 'newest',
  p_limit int DEFAULT 40,
  p_offset int DEFAULT 0
) → jsonb
```

### Response (relevant fields)

| Field | Meaning |
|---|---|
| `products[]` | Page rows in authoritative order |
| `products[].id` | **Parity key** — compare these sequences |
| `has_more` | `LIMIT n+1` probe; not a live `COUNT(*)` |
| `total` / `total_status` | `exact` only on final page semantics; otherwise `unavailable` |
| `filter_coverage` | Taxonomy coverage ratios for UI exposure |
| `sparse_filters` | Filters too sparse to promote |
| `debug.rpc_version` | Must be `catalog_browse_page_v2` |

---

## Param mapping (must match)

| Intent | RPC param | Notes |
|---|---|---|
| Apparel-only shop (no garment) | `p_category = 'clothing'` | iOS `apparelOnly`; web default |
| Material family | `p_material_family` | `leather_suede` → `leather`; never `denim` |
| Denim | `p_fabric_construction = 'denim'` | Indexed construction, not text probe |
| Subtype | `p_material_subtype` | Canonical slug |
| Color | `p_color` | Lowercase family |
| Price | `p_min_price` / `p_max_price` | Server-side only |
| Sort | `p_sort` | `newest` \| `price_asc` \| `price_desc` \| `most_natural` |
| Material NFP floor | `p_min_nfp = 80` | When family is set |

**iOS:** `CatalogBrowseRequest` → `SupabaseManager.fetchAuthoritativeBrowsePageV2`  
**Web:** `buildCatalogBrowseV2Params` / `queryCatalogBrowsePageV2` → `queryLiveCatalog`

---

## Regression test

```bash
# RPC self-parity (identical params → identical IDs)
node --env-file=.env scripts/qa-browse-id-parity.mjs

# Include live web /api/shop (after deploy)
SHOP_API_BASE=https://www.intertexe.com/api/shop \
  node --env-file=.env scripts/qa-browse-id-parity.mjs
```

Fails if:

1. Two identical RPC calls diverge in ID order
2. `/api/shop` returns a different ID prefix than the RPC
3. `/api/shop` is not on `catalog_browse_page_v2`

Report: `docs/BROWSE_ID_PARITY_LATEST.json`

---

## Out of scope (legacy allowed)

- Editorial **collections**
- **Sale** catalog RPCs

These do not use `catalog_browse_page_v2` yet and are excluded from this parity suite.
