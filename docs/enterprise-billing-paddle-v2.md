# INTERTEXE billing + entitlements (Paddle + obelisk-core)

Paddle is the **billing source of truth**. obelisk-core / INTERTEXE is the **entitlement source of truth**.

## Environment variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `PADDLE_API_KEY` | Server only | Paddle Billing API |
| `PADDLE_WEBHOOK_SECRET` | Server only | Webhook HMAC verification |
| `PADDLE_ENV` | Server | `sandbox` (default) or `production` |
| `PADDLE_GRACE_PERIOD_DAYS` | Server | Grace after `past_due` (default 14) |
| `PADDLE_PRICE_PLATFORM` | Server | Platform $499/mo price ID |
| `PADDLE_PRICE_PROFESSIONAL` | Server | Professional $1,250/mo price ID |
| `PADDLE_PRICE_IMPLEMENTATION` | Server | Implementation $5,000 one-time price ID |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Client (optional) | Paddle.js only if using overlay checkout |

Never put `PADDLE_API_KEY` or `PADDLE_WEBHOOK_SECRET` in `NEXT_PUBLIC_*`, git, logs, or API responses.

## Sandbox catalog sync

```bash
PADDLE_API_KEY=... npx tsx scripts/sync-paddle-catalog.ts
```

Writes the commercial reference to `scripts/output/paddle-catalog-ids.json` — one doc with price IDs, list prices, and enforced limits for commercial + engineering. Also prints `.env` lines.

## Plans (internal)

| Plan | Products | Hosted passports | Paddle |
|------|----------|------------------|--------|
| demo | 10 | 10 | No |
| platform | 500 | 500 | Yes |
| professional | 5,000 | 5,000 | Yes |
| enterprise | contract | contract | Manual / invoice |

Demo is **not** a Paddle product.

## Webhook endpoint

`POST /api/webhooks/paddle`

Configure in Paddle dashboard → Developer tools → Notifications.

## Migration

Apply `028_billing_entitlements.sql` on obelisk-core before production billing.
