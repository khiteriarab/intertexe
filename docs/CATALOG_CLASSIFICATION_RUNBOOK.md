# Catalog classification runbook

**Goal:** Every live consumer product is valid women’s apparel, fully classified, rail-assigned, and shown as **one card per garment** (regional rows = offers, not duplicate slots).

**Hard rules:** No UI changes. No `DELETE FROM products`. No `approved` / `composition` / `tags` / `collection_slugs` overwrites. Derived tables only.

---

## Safe execution order

| Step | File | Writes? | When |
|------|------|---------|------|
| **1** | `supabase/manual/01_audit_classification_readonly.sql` | No | Now (Disk IO ok) |
| **2** | `supabase/manual/02_audit_classification_preview.sql` | No | After step 1 |
| **3** | `supabase/migrations/20240021_catalog_classification_layer.sql` | DDL only | **Approve** then one maintenance window |
| **4a** | `supabase/manual/03_backfill_offer_classification_batch.sql` | Derived rows | Off-peak; repeat until `remaining_unclassified = 0` |
| **5** | `supabase/manual/04_backfill_canonical_batch.sql` | Canonical + link | After 4a; repeat INSERT/UPDATE batches |
| **4b** | `supabase/manual/05_backfill_rail_membership.sql` | Membership | After 5 |
| **6** | `supabase/manual/06_refresh_feeds_from_membership.sql` **or** `refresh_one_rail_at_a_time.sql` | Cache only | After rails populated |
| **7** | `supabase/manual/07_verify_classification_complete.sql` | No | Sign-off |

---

## What each layer does

| Layer | Object | Purpose |
|-------|--------|---------|
| L0 | `products` | Raw regional **offers** (unchanged) |
| L1 | `live_products_apparel` | Consumer scope view (20240020) |
| L2 | `product_offer_classification` | Per-offer material, garment, completeness, inferred rails |
| L3 | `canonical_products` + `products.canonical_id` | One garment/style; many offers |
| L4 | `product_material_facts`, `product_garment_facts` | Canonical-level derived truth |
| L5 | `product_rail_membership` | Merchandising rail eligibility |
| L6 | `consumer_catalog_cards` | **One visible card** per style (best regional offer) |
| L7 | `homepage_feed_items` | Homepage carousel cache (32 items/rail, not full catalog) |

---

## Material & garment enums

**Material (`catalog_classify_material`):**  
`silk`, `linen`, `cashmere`, `wool`, `cotton`, `leather_suede`, `viscose_rayon`, `synthetic_blend`, `unknown_material`

**Garment (`catalog_classify_garment`):**  
`dresses`, `tops_blouses`, `shirts`, `knitwear`, `sweaters_cardigans`, `pants_trousers`, `skirts`, `shorts`, `jackets_blazers`, `coats`, `matching_sets`, `swim_resortwear`, `scarves_wraps`, `other_apparel`, `needs_review`

**Completeness:** `complete` | `needs_review` | `excluded`  
**Review reasons:** `missing_currency`, `unknown_material`, `unknown_garment`, or consumer exclusion reason.

---

## Rails (`catalog_infer_rail_keys`)

| rail_key | Rule |
|----------|------|
| `fabrics:silk` | material = silk |
| `fabrics:linen` | material = linen |
| `fabrics:cashmere` | material = cashmere |
| `fabrics:wool` | material = wool |
| `fabrics:cotton` | material = cotton |
| `fabrics:leather-suede` | material = leather_suede |
| `collections:vacation` | `collection_slugs` ∩ vacation slugs |
| `collections:evening` | editorial slugs |
| `collections:tailoring` | editorial slugs |
| `collections:white-edit` | editorial slugs |
| `collections:summer-in-the-city` | editorial slugs |
| `sale:all` | `is_sale` |
| `top:new_in` | brand allowlist + created within 90 days |

---

## Disk IO tips

- Run **one SELECT block** or **one DO $$ batch** per SQL Editor tab.
- Batch size: **3000** offers (step 4a); **5000** canonical inserts (step 5).
- Do **not** run full-catalog `TRUNCATE` + rebuild during IO budget warning.
- Homepage refresh: keep using **per-rail** scripts until membership cutover is verified.

---

## Sign-off targets (step 7)

- `live_products_apparel` ≈ scoped consumer count (~170k post-20240020).
- `complete_offers` / `live_apparel_offers` ratio documented (not required 100% day one).
- `consumer_catalog_cards` << `live_products_apparel` (dedupe working).
- `duplicate_visible_slots` trending down after canonical link.
- `homepage_feed_meta.last_error` NULL on enabled rails.
- `not_womens_in_apparel_view` = 0.

---

## Rollback

See bottom of `20240021_catalog_classification_layer.sql`. Does not remove `products` rows.

---

## App / web cutover (later)

- Point catalog reads at `consumer_catalog_cards` or `live_products_classified` behind a flag.
- Keep `refresh_one_rail_at_a_time.sql` until `06_refresh_feeds_from_membership.sql` parity confirmed.
- iOS `SupabaseManager` already uses `live_products_apparel`; switch table/view only after phase-5 approval.
