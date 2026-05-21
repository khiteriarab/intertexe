# Apply consumer scope cleanup (backend only)

## What this does

- Keeps all rows in `products` (no deletes).
- Does not change `approved`, `composition`, `tags`, or `collection_slugs`.
- Replaces **`live_products`** and **`live_products_apparel`** views so consumer paths only see:
  - `approved = yes`
  - `is_active` true
  - valid image, price, URL, composition
  - women's apparel category (not shoes, bags, mens, kids, beauty/home, etc.)
  - apparel view also requires `natural_fiber_percent >= 80` and listed price/image

## Apply (one time in Supabase)

1. Paste and run entire file:
   `supabase/migrations/20240020_catalog_consumer_scope.sql`
2. Run verification:
   `supabase/manual/verify_consumer_scope.sql`
3. When Disk IO allows, refresh homepage cache **per rail** using:
   `supabase/manual/refresh_one_rail_at_a_time.sql` (blocks A–H)

Do **not** run full `refresh_homepage_feeds_v2()` while Disk IO is depleted.

## iOS / web

- Web already reads `live_products_apparel` and `homepage_feed_items` on hot paths.
- iOS `main` uses `live_products_apparel` for shop/home product lists (not raw `products`).
- Homepage rails still use `homepage_feed_items` (refresh after scope apply).

## Rollback

See bottom of `20240020_catalog_consumer_scope.sql` — restore previous view definitions from backup.
