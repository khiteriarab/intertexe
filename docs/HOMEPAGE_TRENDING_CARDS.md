# Homepage trending cards (remote, no app release)

The iOS app Home screen **Trending** grid reads from Supabase table `homepage_trending_cards`. Edit rows in Supabase (or run a migration) to change copy, images, and tap destinations. **No App Store rebuild** is required for those changes.

Rebuild the iOS app only when you change **Swift defaults** (offline fallback) or **tap routing logic** in `HomepageTrendingSection.swift`.

## How updates reach devices

1. Edit `homepage_trending_cards` in Supabase (Table Editor or SQL).
2. Enabled rows with `enabled = true` are returned, ordered by `sort_order`.
3. The iOS app refetches when Home appears and when the app returns to foreground, using a **5-minute session cache** so edits show up quickly without hammering the API.

If the table is empty or the fetch fails, the app shows baked-in defaults in `TrendingCard.defaults` (offline / first launch only).

## Column reference

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | `text` | yes | Stable primary key (e.g. `trending-cashmere`). |
| `sort_order` | `smallint` | yes | Display order (lower first). |
| `eyebrow` | `text` | no | Small label above the title (usually unused). |
| `title` | `text` | yes | Card headline (e.g. `Cashmere`). |
| `subtitle` | `text` | no | Supporting line under the title. |
| `cta_label` | `text` | no | Underlined CTA (defaults to “Shop now” in app if null). |
| `image_url` | `text` | no | Full HTTPS URL for the card image. |
| `link_type` | `text` | yes | Tap behavior — see below. |
| `link_value` | `text` | no | Slug, URL, or tab name depending on `link_type`. |
| `enabled` | `boolean` | yes | `false` hides the card from the app. |
| `created_at` | `timestamptz` | auto | Row creation time. |
| `updated_at` | `timestamptz` | auto | Last edit time. |

## `link_type` values

| `link_type` | `link_value` | Result |
|-------------|--------------|--------|
| `quiz` | (ignored) | Opens Style Quiz (More tab). |
| `fiber` | fiber slug, e.g. `cashmere` | Shop catalog filtered by fiber. |
| `category` | category enum raw value | Shop catalog filtered by category. |
| `collection` | collection slug, e.g. `denim` | Opens editorial collection page. |
| `external` | full URL | Opens in Safari. |
| `tab` | `shop`, `scanner`, `wishlist`, `account` | Switches bottom tab. |

Unknown `link_type` values fall back to collection routing.

## Example: swap Linen → Cashmere

```sql
UPDATE public.homepage_trending_cards
SET
  title = 'Cashmere',
  subtitle = 'Warm, soft, and endlessly luxurious.',
  cta_label = 'Shop cashmere',
  image_url = 'https://www.intertexe.com/fabrics/fabric-cashmere.jpg',
  link_type = 'fiber',
  link_value = 'cashmere',
  updated_at = now()
WHERE id = 'trending-linen'
   OR lower(coalesce(link_value, '')) = 'linen'
   OR lower(title) = 'linen';
```

## Migrations

- `supabase/migrations/20260829_homepage_trending_cashmere.sql` — one-off Linen → Cashmere update.
- `supabase/migrations/20260830_homepage_trending_cards_remote.sql` — table definition, RLS, seed rows.

Apply on production with your usual Supabase migration flow or:

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/apply-sql-via-mgmt-api.mjs \
  supabase/migrations/20260830_homepage_trending_cards_remote.sql
```

## iOS code (for engineers)

| File | Role |
|------|------|
| `HomepageTrendingSection.swift` | UI, tap routing, offline defaults |
| `SupabaseManager.swift` | `fetchTrendingCards()` + 5 min cache |

Do **not** add client-side remapping of remote rows — Supabase is the source of truth.
