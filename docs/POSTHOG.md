# PostHog analytics (consumer web)

PostHog powers product analytics and session replay on **www.intertexe.com** consumer pages only.

## Project

| Field | Value |
|-------|-------|
| Project ID | `696070` |
| Region | US Cloud |
| API host | `https://us.i.posthog.com` |
| UI | `https://us.posthog.com` |

Use the **Project token** (`phc_…`) from PostHog → Settings → Project → General as `NEXT_PUBLIC_POSTHOG_KEY`. It is write-only and safe in the browser; never commit it to git.

## Env vars (Vercel + local)

| Variable | Required | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_POSTHOG_KEY` | yes | `phc_…` (Project token from Settings → General) |
| `NEXT_PUBLIC_POSTHOG_HOST` | no (defaults US) | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_POSTHOG_UI_HOST` | no | `https://us.posthog.com` |
| `NEXT_PUBLIC_POSTHOG_REPLAY` | no (default on) | `1` or `0` |

Never commit real keys. Set them in Vercel → Project → Settings → Environment Variables (Production + Preview). After merge, confirm Live events land under project **696070**.

## Consent

PostHog initializes only after the existing cookie banner is **Accept**ed (`cookie_consent=accepted`), same gate as Meta Pixel. Decline opts out capturing.

## What we track

Via `lib/analytics.ts` (also still fires GA4 / Meta where applicable):

- `$pageview` (SPA)
- `product_viewed`
- `search`
- `material_filter` (shop fiber / category / color / brand)
- `affiliate_click` / `affiliate_redirect`
- `scan_start` / `scan_complete` / `scan_error`
- `product_favorite`
- Identify signed-in users with Supabase UUID only (`setGaUserId`)

## Session replay privacy

When enabled: mask all inputs; extra mask on password/email/textarea and `[data-ph-mask]`. Not mounted on dashboard / platform / passport chrome.

## Out of scope

Chrome extension, iOS native app, Supabase server paths, B2B `/brands` / `/platform` / `/dashboard`.

## Verify in PostHog

1. Deploy with env vars set (or run locally with `.env.local`).
2. Open www (or localhost), **Accept** cookies.
3. Visit `/shop`, change a fiber filter, open a product, click Shop Now.
4. In PostHog → **Activity** / **Live events**, confirm `$pageview`, `material_filter`, `product_viewed`, `affiliate_click`.
5. **Session replay** → open a recent recording; inputs should be masked.
6. Optional: browser console `posthog.debug()` after accept.
