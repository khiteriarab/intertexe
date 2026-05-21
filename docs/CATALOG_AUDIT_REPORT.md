# Catalog audit report (template — fill after running SQL)

**Status:** Read-only phase. **No deletes. No approval/composition/slug overwrites.**

Run: [`supabase/manual/audit_catalog_inventory_readonly.sql`](../supabase/manual/audit_catalog_inventory_readonly.sql)  
Paste counts into the tables below, then review before any cleanup.

---

## 1) Exact row counts (paste from SQL)

| Metric | Your count |
|--------|------------|
| `products_total` | |
| `live_products` | |
| `live_products_apparel` | |
| `approved = yes` | |
| `is_active = false` | |
| `approved_active_not_in_apparel_view` | |
| `canonical_style_groups` (dedupe keys) | |
| `offer_rows_live_apparel` | |
| `multi_region_offer_clusters` | |
| `in_homepage_feed_cache` (distinct products) | |
| `live_apparel_not_in_any_homepage_rail` | |

### Approval breakdown

| approved | count |
|----------|-------|
| yes | |
| review | |
| pending | |
| inactive | |
| no | |

### Quality gaps (all products / live apparel)

| Gap | all `products` | on `live_products_apparel` |
|-----|----------------|------------------------------|
| missing_image | | |
| missing_price | | |
| missing_url | | |
| missing_composition | | |
| missing_category | | |

### Out-of-scope buckets (heuristic)

| Bucket | all products | approved=yes | inside live_apparel |
|--------|--------------|--------------|---------------------|
| shoes | | | |
| bags | | | |
| jewelry | | | |
| accessories | | | |
| mens | | | |
| kids | | | |
| beauty_home | | | |

### Fiber detection (live apparel, composition only)

| fiber | count |
|-------|-------|
| silk | |
| linen | |
| cashmere | |
| wool | |
| cotton | |
| leather-suede | |
| (none detected) | |

### Disposition summary (section 8)

| Code | Meaning | count |
|------|---------|-------|
| **A_keep_live_catalog** | Women’s apparel, in view, quality OK | |
| **B_archive_soft** | Inactive / stale / not approved for consumer | |
| **C_exclude_out_of_scope** | Shoes, bags, mens, kids, beauty/home, etc. | |
| **C_exclude_missing_quality** | Missing image/price/url/composition | |
| **D_needs_tagging_rail** | In apparel, no fiber, no slug, not in cache | |
| **D_needs_rail_or_collection** | In apparel, needs rail or editorial assignment | |
| **E_raw_source_hold** | Everything else — hold for review | |

---

## 2) What should happen to each bucket (no action yet)

| Bucket | Action when approved | Touches `products` rows? |
|--------|----------------------|---------------------------|
| **A_keep_live_catalog** | Stay on `live_products` path; add canonical + tags | No delete; optional `canonical_id` |
| **B_archive_soft** | Keep row; `is_active = false` or `approved` unchanged; exclude from views | **No delete** |
| **C_exclude_out_of_scope** | Exclude from `live_products_apparel` gate (view rule) or `display_excluded_reason` column | **No delete**; may set `approved` only with explicit review |
| **C_exclude_missing_quality** | Exclude from display; keep for feed repair | **No delete** |
| **D_needs_tagging** | Backfill `product_material_facts` + `product_rail_membership` | Derived tables only |
| **Regional duplicates** | Link to one `canonical_products`; keep US/UK/EU offers | **No delete** |

---

## 3) What is slowing Supabase (from architecture + IO)

| Source | Why it hurts | Mitigation (no UI change) |
|--------|--------------|---------------------------|
| **`catalog_list` / `catalog_list_count`** | Full-table-style RPC over apparel + dedupe | Use `homepage_feed_items` + meta counts on hot paths (already on web homepage) |
| **`refresh_homepage_feeds_v2`** | 5000-row pool scan | Per-rail refresh only while IO depleted |
| **Large `products` seq scans** | Audit/sync without selective indexes | Run audits off-peak; use counts in sections 1–8 only |
| **High `n_dead_tup` on products** | Bloat from feed upserts | `VACUUM (ANALYZE) products` in maintenance window (not delete) |
| **Disk IO budget depleted** | Supabase throttles disk | Wait for reset; avoid parallel heavy jobs |
| **Duplicate “cards”** | Same style, many regions counted as separate products in non-deduped queries | Canonical layer + display dedupe (phase 2+) |

Check section **9** of audit SQL (`pg_stat_user_tables`) for `seq_scan` vs `idx_scan` on `products`.

---

## 4) Safe cleanup plan (requires approval — not run now)

### Phase A — Display exclusion (no row delete)

1. Add optional column: `products.display_excluded_reason text` (nullable).  
2. **Do not** mass-update from feed. Set only via reviewed SQL batches by bucket (`shoes`, `mens`, etc.).  
3. Update `live_products_apparel` **view** to filter `display_excluded_reason IS NULL`.  
4. Rollback: `UPDATE products SET display_excluded_reason = NULL WHERE …` or drop column.

### Phase B — Soft archive (inactive offers)

1. Ensure feed sync `markInactiveProducts` runs (sets `is_active = false` when `last_seen_at` stale).  
2. Review `stale_approved_yes_inactive` count — consider `approved` review queue, **not** auto-delete.  
3. Rollback: re-activate rows with evidence from feed `last_seen_at`.

### Phase C — Canonical + offers (normalization phase 1)

1. Apply `20240019` DRAFT (additive).  
2. Batched backfill `canonical_id` (5000 rows/batch).  
3. Rollback: `canonical_id = NULL`; truncate derived tables.

### Phase D — Tagging / rails

1. Rebuild `product_material_facts` from composition + `material_metadata`.  
2. Rebuild `product_rail_membership` (material truth > slug).  
3. Refresh `homepage_feed_items` per rail (existing manual SQL).  
4. Rollback: truncate membership; refresh cache from legacy sources.

**Never in any phase:** `DELETE FROM products`, blind `approved = 'no'`, overwrite `composition` / `collection_slugs` from feed.

---

## 5) Archive / exclusion plan

| Category | Archive signal | Display |
|----------|----------------|---------|
| Stale feed | `is_active = false`, old `last_seen_at` | Hidden via `live_products` |
| Rejected / pending | `approved != 'yes'` | Hidden |
| Out of scope | `display_excluded_reason` or view gate | Hidden |
| Missing quality | view gate | Hidden |
| Valid apparel | none | Shown via cache/RPC |

**Archive = row stays in `products`**, only removed from consumer views.

---

## 6) Tagging / backfill plan

Every **valid women’s apparel** offer should eventually have:

| Field | Source |
|-------|--------|
| `category` | Feed + manual QC for gaps |
| Fabric tag | `product_material_facts.primary_fiber` from composition |
| Canonical | `catalog_style_key` / `catalog_dedupe_key` cluster |
| Offers | Multiple `products` rows → one `canonical_id` |
| Rail | `product_rail_membership.rail_key` |
| Editorial | `collection_slugs` + CMS canonical slugs (alias table) |
| Sale / new-in | `is_sale`, `created_at`, brand allowlists |

Order: material facts → rail membership → homepage cache refresh.

---

## 7) Verification queries (after any approved change)

```sql
-- Consumer surface size
SELECT COUNT(*) FROM live_products_apparel;

-- No shoes in apparel (after view update)
SELECT COUNT(*) FROM live_products_apparel l
WHERE lower(coalesce(l.category,'')) LIKE '%shoe%';

-- Cache still populated
SELECT rail_key, COUNT(*) FROM homepage_feed_items GROUP BY 1;

-- Canonical linkage (after phase C)
SELECT COUNT(*) FROM products WHERE canonical_id IS NOT NULL;
SELECT COUNT(*) FROM canonical_products;
```

---

## 8) Rollback plan

| Change | Rollback |
|--------|----------|
| View gate tightened | `CREATE OR REPLACE VIEW live_products_apparel` to previous definition |
| `display_excluded_reason` | Set NULL or drop column |
| Canonical backfill | `UPDATE products SET canonical_id = NULL` |
| Derived tables | `TRUNCATE` membership/facts |
| Homepage cache | Per-rail refresh from legacy pool or truncate + refresh |

Source rows in `products` always remain unless **you** explicitly approve a separate data-retention policy.

---

## 9) Next steps

1. Run audit SQL; fill section 1 tables.  
2. Sample 10 rows per out-of-scope bucket (manual QA).  
3. Confirm Disk IO stable on Supabase dashboard.  
4. Approve Phase A/B/C in writing.  
5. Normalization stays phase 0 until audit reviewed.

**No UI changes. No destructive SQL until sign-off.**
