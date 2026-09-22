# INTERTEXE billing + entitlements (Paddle + obelisk-core)

Paddle is the **billing source of truth**. obelisk-core / INTERTEXE is the **entitlement source of truth**.

## Public tiers ↔ entitlement keys

| Public name | Entitlement / DB key | Monthly | Implementation | Products / passports | Seats |
|-------------|----------------------|---------|----------------|----------------------|-------|
| Foundation | `professional` | $499 | $1,500 | 2,500 | 5 |
| Intelligence | `platform` | $1,250 | $3,500 | 10,000 | 15 |
| Enterprise | `enterprise` | Custom | Custom (from ~$5,000) | Contract | Contract |

Demo / 10-product pilot is **not** a Paddle product.

## Environment variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `PADDLE_API_KEY` | Server only | Paddle Billing API |
| `PADDLE_WEBHOOK_SECRET` | Server only | Webhook HMAC verification |
| `PADDLE_ENV` | Server | `sandbox` (default) or `production` |
| `PADDLE_GRACE_PERIOD_DAYS` | Server | Grace after `past_due` (default 14) |
| `PADDLE_PRICE_FOUNDATION` | Server | Foundation $499/mo price ID |
| `PADDLE_PRICE_INTELLIGENCE` | Server | Intelligence $1,250/mo price ID |
| `PADDLE_PRICE_IMPLEMENTATION_FOUNDATION` | Server | Foundation implementation $1,500 one-time |
| `PADDLE_PRICE_IMPLEMENTATION_INTELLIGENCE` | Server | Intelligence implementation $3,500 one-time |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Client (optional) | Paddle.js only if using overlay checkout |

### Legacy aliases (still accepted)

| Legacy env | Maps to |
|------------|---------|
| `PADDLE_PRICE_PLATFORM` / `PADDLE_PRICE_SAAS_PLATFORM` / `PADDLE_PRICE_SAAS_STARTER` | Foundation subscription |
| `PADDLE_PRICE_PROFESSIONAL` / `PADDLE_PRICE_SAAS_PROFESSIONAL` / `PADDLE_PRICE_SAAS_GROWTH` | Intelligence subscription |
| `PADDLE_PRICE_IMPLEMENTATION` / `PADDLE_PRICE_FOUNDING_PILOT` | Generic implementation fallback |

Optional override map: `PADDLE_PRICE_PLAN_MAP_JSON={"pri_…":{"plan":"enterprise","productAllowance":50000,"passportAllowance":25000,"kind":"subscription"}}`

Never put `PADDLE_API_KEY` or `PADDLE_WEBHOOK_SECRET` in `NEXT_PUBLIC_*`, git, logs, or API responses.

## Sandbox catalog sync

```bash
PADDLE_API_KEY=... npx tsx scripts/sync-paddle-catalog.ts
```

Creates Foundation + Intelligence subscription prices and tiered implementation prices. Writes `scripts/output/paddle-catalog-ids.json` and prints `.env` lines. Copy the preferred `PADDLE_PRICE_FOUNDATION` / `PADDLE_PRICE_INTELLIGENCE` / `PADDLE_PRICE_IMPLEMENTATION_*` lines into your server env.

## Webhook endpoint

`POST /api/webhooks/paddle`

Configure in Paddle dashboard → Developer tools → Notifications.

## Migration

Apply `028_billing_entitlements.sql` on obelisk-core before production billing.
