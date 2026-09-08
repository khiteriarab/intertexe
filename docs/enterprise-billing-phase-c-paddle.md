# Enterprise billing — Phase C (Paddle)

Phase C adds **Paddle Billing** for B2B org subscriptions (not Stripe). Phase B gates (publish allowance, carrier lifecycle) remain unchanged.

## Implemented

| Area | Detail |
|------|--------|
| Migration `022_paddle_billing.sql` | `paddle_customer_id`, `paddle_subscription_id` on `billing_accounts` |
| `lib/enterprise/paddle.ts` | Checkout, webhook verify, subscription → org sync |
| `POST /api/webhooks/paddle` | Paddle Billing webhooks |
| `POST /api/dashboard/org/[org]/billing/checkout` | Org admin → Paddle checkout URL |
| `GET /api/dashboard/enterprise/billing` | HQ MRR, orgs at passport/product limit, unpaid publish |
| Settings UI | “Upgrade with Paddle” on `free_snapshot` |
| Import enforcement | `assertCanAddProducts` in `pipeline.ts` (hard stop + per-row errors) |

## Environment (Vercel + local)

```bash
PADDLE_API_KEY=pdl_...
PADDLE_WEBHOOK_SECRET=...
PADDLE_ENVIRONMENT=sandbox   # or production
PADDLE_PRICE_FOUNDING_PILOT=pri_...
PADDLE_PRICE_SAAS_STARTER=pri_...
```

Webhook URL (production):

`https://www.intertexe.com/api/webhooks/paddle`

## Paddle dashboard setup

1. Create Products/Prices for Founding Pilot and SaaS tiers.
2. Add **custom_data** passthrough (automatic via checkout API).
3. Subscribe webhook to: `subscription.created`, `subscription.updated`, `subscription.canceled`, `transaction.completed`.
4. Map each Price ID in env vars (or `PADDLE_PRICE_PLAN_MAP_JSON`).

## HQ widgets

Founder **Dashboard → Enterprise** shows:

- MRR / ARR estimate (from `billing_accounts.contract_value`)
- Orgs at passport allowance
- Orgs at product allowance
- Orgs with published passports but unpaid invoice

## obelisk-core migrations

- `021_data_carriers_lifecycle.sql` — applied (dedupes duplicate QR carriers before unique index)
- `022_paddle_billing.sql` — applied

Local ops token: `.env.enterprise.local` (gitignored).
