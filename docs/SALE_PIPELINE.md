# Sale pipeline (current behavior)

How sale flags are set at ingest, how the Sale API reads them, and how designer PLPs surface markdowns. Derived from code — not aspirational.

Related: `docs/PRODUCTION_RELIABILITY_RELEASE.md` (P1 sale reliability).

## Merchants / feed sources

| Source | Path | Sale support |
|---|---|---|
| **Rakuten** (multi-MID FTP XML) | `lib/feed-sync/rakuten-sync.js` → `normalizeProduct` | `is_sale` set via `isSale()` |
| **MyTheresa** (Rakuten MIDs `35663`, `43172`, `43654`) | Same sync; `feed_source: 'mytheresa'` | Same `isSale()` plus MyTheresa-specific URL / retail-price heuristics |
| **Rakuten footwear** | Same sync when footwear gate passes and apparel does not | `feed_source: 'rakuten_footwear'`; sale flag still via `isSale()` |
| **SSENSE** | — | **Not implemented** (scanner/retailer map only; no affiliate feed ingest) |
| **Awin** (`scripts/import-awin-feed.cjs`) | Legacy / secondary import | Does not currently write `is_sale` on insert |

Primary production catalog path for sale is **Rakuten + MyTheresa** through the feed chunk runner (`lib/feed-sync/run-rakuten-chunk.ts`).

## How `is_sale` is set (ingest)

In `lib/feed-sync/rakuten-sync.js`, `isSale(price, originalPrice, row)` returns true when any of:

1. Explicit feed flag: `is_sale` / `sale` / `on_sale` ∈ `{true, yes, 1, sale}`
2. Sale price &lt; retail price (`sale_price`/`price` vs `retail_price`/`original_price`/`was_price`/`list_price`/`msrp`) — preferred for MyTheresa JSON-style fields
3. Parsed `price` &lt; `original_price`
4. Discount percent / amount ≥ 5 (`discount_percent`, `discount`, `percent_off`, `sale_percent`) when price fields are equal
5. URL contains sale/markdown path tokens (`/sale/`, `onsale`, `markdown`, …) — important when MyTheresa sends identical price fields
6. Category text matches `\bsale\b` / `\boutlet\b` / `\bmarkdown\b`

Normalized row stores:

- `is_sale: isSale(...)`
- `original_price`, `discount_percent` (when computable)
- `feed_source`: `mytheresa` | `rakuten` | `rakuten_footwear`

### MyTheresa notes

- Detected by MID set (`35663`, `43172`, `43654`) or advertiser/feed URL containing `mytheresa`.
- Region/currency resolved in `resolveMidRegionCurrency` (MID `43172` splits US USD vs CA CAD).
- Sale detection leans on retail/sale price pairs and **sale URL paths** when list and sale prices are identical in the feed.
- Soft-inactive / markInactive includes `mytheresa` in default `markInactiveSources`.

### SSENSE

No SSENSE product feed sync, no `is_sale` mapping, no Sale API merchant filter for SSENSE. App mentions are scanner/URL-brand mapping only.

## Read path: Sale API

`GET /api/sale` (`app/api/sale/route.ts`) → `fetchSaleProducts` (`lib/supabase-server.ts`).

Default for the API: `useMerchFeedPreview: false` → **direct query** via `fetchSaleProductsDirect` / `buildSaleDirectQuery`:

- Apparel sale: `live_products_apparel` where `is_sale = true`, region, NFP ≥ 80, image + price present.
- Footwear sale filter (`fiber=shoes` or category shoes/footwear): `products` where `is_displayable` + `is_sale`, same NFP/image/price guards, plus garment/category/name footwear OR.

Optional homepage path: capped merch rail (`fetchMerchRailProducts(MERCH_RAIL_KEYS.sale)`) when `useMerchFeedPreview` / `maxSourceRows` is set — not the full Sale page.

### Client-side sale truth: `rowIsOnSale`

```ts
function rowIsOnSale(row): boolean {
  if (row?.is_sale === true) return true;
  const curr = parseMoneyValue(row?.price);
  const orig = parseMoneyValue(row?.original_price);
  return orig > curr && curr > 0;
}
```

`mapProductRow` sets `isSale: rowIsOnSale(row)`. Query filters typically also require DB `is_sale = true`, so rows that only have a price gap but `is_sale=false` may still be excluded from Sale lists until re-sync corrects the flag.

Sort options: `discount` (default API), `price-low` / `price-high`, `natural`, `new`. Discount sort re-orders in JS after fetch when needed.

## Designer PLP (sale-first)

`collectBrandCatalogPage` in `lib/supabase-server.ts`:

- Reads **displayable `products`** (not apparel-only view) so shoe designers (Manolo, Roger Vivier, etc.) appear.
- Brand PLP NFP floor is **70%** (global shop stays 80%).
- Order: **`is_sale` DESC**, then `natural_fiber_percent` DESC, then `created_at` DESC — so markdowns surface early in the scan window under the designer name.
- On timeout, in-memory re-sort still prefers `isSale`.

## Gaps remaining

1. **SSENSE (and other non-Rakuten retailers) not in sale pipeline** — no feed → no `is_sale`.
2. **Ingest vs read asymmetry** — Sale lists filter `is_sale=true`; `rowIsOnSale` also accepts price&lt;original. Stale `is_sale=false` with a valid markdown can show on PLP cards (via map) but miss Sale page / rails that `.eq("is_sale", true)`.
3. **MyTheresa equal-price rows** depend on URL/category heuristics; if those signals are missing, markdowns may never flip `is_sale`.
4. **Awin import** does not set `is_sale` today.
5. **Footwear sale** uses a separate `products` query path; apparel sale uses `live_products_apparel` — keep filters aligned when changing Sale UX.
6. **Designer directory / `is_live`** is separate from sale; shoe brands can have displayable sale SKUs while `designers.is_live=false` (see `scripts/audit-designer-directory.mjs`).
7. **Merch feed preview** is a capped rail — must not be used as the full Sale catalog source of truth (`useMerchFeedPreview: false` on `/api/sale`).

## Ops / audit

```bash
node scripts/diagnose-sale-catalog.mjs   # live/raw sale counts
node scripts/audit-designer-directory.mjs # designer vs catalog (incl. shoe not-live)
```
