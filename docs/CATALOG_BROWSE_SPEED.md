# Catalog browse speed contract

Product grids must paint in **under ~8 seconds** on iOS (30s hard timeout). A single bad
`CREATE OR REPLACE FUNCTION catalog_taxonomy_browse_page` migration can silently undo that.

## What went wrong (Aug 2026)

`20260829_catalog_taxonomy_browse_price_hotfix.sql` replaced the fast taxonomy browse function
with a version that:

1. Built a full `eligible → filtered` set for the whole category
2. Ran `COUNT(*)` over **all** filtered rows before `LIMIT`
3. Removed the `clothing/all → catalog_browse_page_v2` delegate

Result: Dresses/Tops/Tanks took 25–60s → iOS **REQUEST TIMED OUT** / empty grids.

## Non-negotiable rules

| Path | Required behavior |
|------|-------------------|
| `clothing/all` | **Always** `RETURN catalog_browse_page_v2(..., p_category := 'clothing')` |
| Mappable leaves (dresses, tops, shirts, …) | **Always** delegate via `catalog_taxonomy_legacy_category` → `catalog_browse_page_v2` |
| Special slugs (sleepwear, matching-sets) | `LIMIT/OFFSET` page only; assignment index lookup; **no** card dedupe |
| Totals on slow paths | `total_status: 'estimated'` OK; never block first page on exact deduped COUNT |

### Forbidden in `catalog_taxonomy_browse_page`

- `counted AS (SELECT count(*)::bigint AS n FROM filtered)`
- `eligible AS (...)` + full `filtered AS (...)` scan without v2 delegate
- Card dedupe (`catalog_card_dedupe`, `dedupe_catalog_cards`)
- Re-applying superseded migrations listed in `scripts/lib/catalog-browse-speed-contract.mjs`

## Single source of truth

**Edit only:** `lib/sql/catalog_taxonomy_browse_page.sql`

Do **not** paste a new function body into random migration files.

### Deploy procedure

```bash
# 1. Static contract (runs on every build)
npm run gate:catalog-browse-speed

# 2. Optional production latency probe
npm run gate:catalog-browse-speed:live

# 3. Apply to prod (guard runs automatically)
SUPABASE_ACCESS_TOKEN=... node scripts/apply-sql-via-mgmt-api.mjs lib/sql/catalog_taxonomy_browse_page.sql
```

`scripts/apply-sql-via-mgmt-api.mjs` refuses superseded slow migrations and validates any
SQL that redefines `catalog_taxonomy_browse_page`.

## CI / build gates

- `npm run build` → runs `gate:catalog-browse-speed`
- `npm run test:catalog-browse-speed` → unit tests including the price_hotfix regression fixture

## iOS / web parity

TypeScript also routes hot paths client-side (`lib/catalog-taxonomy.ts`,
`taxonomyLegacyBrowseCategory`). DB and app layers must stay aligned — if you add a new
clothing leaf slug, update **both** the canonical SQL and `taxonomyLegacyBrowseCategory()`.
