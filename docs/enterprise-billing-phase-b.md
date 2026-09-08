# Enterprise billing — Phase B recommendations

INTERTEXE enterprise billing is **plan + allowance based** today. Phase B wires those gates into publish and settings UI. Full payment automation (Stripe) is the recommended next layer — not yet integrated.

## Approved Phase B decisions (carriers)

| Decision | Choice |
|----------|--------|
| Schema | **Extend `data_carriers`** — no `product_data_carriers` table |
| Identity minting | **Option B** — mint `persistent_identities` + passport shell at **ready**; carriers start **draft**, activate on publish |
| UI placement | **Product detail sidebar** — dedicated tab only when batch/carrier volume warrants it (Phase C) |

## What Phase B implements now

1. **Migration `021_data_carriers_lifecycle.sql`** — carrier `state` (`draft` / `active` / `retired`), lifecycle timestamps, product/identity FKs, partial unique index (one active carrier per type per passport), Stripe-ready columns on `billing_accounts`.
2. **`lib/enterprise/carriers.ts`** — provision draft QR, sync on publish (no duplicate rows), NFC/RFID draft registration, retire.
3. **`lib/enterprise/billing-gates.ts`** — plan entitlements, passport allowance check before publish, usage meter on first publish, billing dashboard for settings.
4. **Publish path** — `assertCanPublishPassport` + `syncQrCarrierOnPublish` + `recordPassportPublished`.
5. **UI** — `ProductCarriersPanel` in product sidebar; settings shows plan, meters, publish block reason.

## Billing model (recommended)

### Tiers (align with `lib/enterprise/entitlements.ts`)

| Plan | Products | Passports | Publish | Price signal |
|------|----------|-----------|---------|--------------|
| `free_snapshot` | 10 | 1 | No | Lead gen / evaluation |
| `founding_pilot` | 500 | 100 | Yes | Fixed annual contract |
| `saas` | Custom | Custom | Yes | Catalog-size + API volume |
| `internal` | Unlimited | Unlimited | Yes | INTERTEXE ops |

**Meter keys:** `products_active`, `passports_published`, `imports_completed`, `api_calls`, `storage_bytes`.

**Allowance rules:**
- First publish of a product consumes one passport slot; **republish does not**.
- Product import/create should call `canAddProducts` (existing) — wire in Phase C if not already enforced on import.

### Manual billing (current — keep for pilots)

`billing_accounts` tracks contract value, invoice status, collected/outstanding, renewal. HQ/founder updates via admin SQL or future HQ billing UI.

**Good for:** founding pilots, annual contracts, custom MSAs.

### Stripe integration (recommended Phase C)

Use **Stripe Billing** with **organization = Stripe Customer** (B2B), not per-user subscriptions.

```
organizations.plan          ← synced from Stripe Price metadata
organizations.passport_allowance
billing_accounts.stripe_customer_id
billing_accounts.stripe_subscription_id
billing_accounts.plan_key
```

**Suggested products/prices:**

1. **Founding Pilot** — annual Price, metadata `{ plan: founding_pilot, passport_allowance: 100, product_allowance: 500 }`
2. **SaaS Starter** — monthly Price, metadata with lower caps
3. **SaaS Growth** — monthly/annual, custom caps via Stripe Customer Portal + manual override in `organizations`

**Webhooks to implement** (`/api/webhooks/stripe`):

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Link `stripe_customer_id`, set plan + allowances from Price metadata |
| `customer.subscription.updated` | Sync plan, renewal_date, cancellation_state |
| `customer.subscription.deleted` | Downgrade to `free_snapshot`, block new publishes |
| `invoice.paid` | Update `amount_collected`, `invoice_status` |
| `invoice.payment_failed` | Set `cancellation_state`, optional grace period before publish block |

**Enforcement order:**

1. Stripe webhook updates `organizations.plan` + `billing_accounts`
2. `assertCanPublishPassport` reads entitlements (already wired)
3. Settings UI shows block reason (already wired)

**Do not** use Stripe for consumer affiliate revenue — that stays on Rakuten/HQ dashboards.

### Usage-based add-ons (optional Phase D)

- Extra passport packs: one-time Stripe Checkout → increment `passport_allowance` on org
- API overage: report `api_calls` meter monthly; invoice via Stripe metered billing or manual true-up

## Environment variables (Stripe Phase C)

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_FOUNDING_PILOT=price_...
STRIPE_PRICE_SAAS_STARTER=price_...
```

## Migration checklist (obelisk-core)

1. Apply `021_data_carriers_lifecycle.sql` on enterprise Supabase
2. Verify existing QR rows backfilled (`state=active`, `product_id` set)
3. Smoke: provision draft QR on ready product → publish → single active QR, allowance decremented once

## HQ visibility (recommended)

Add founder dashboard widgets:

- Orgs at passport allowance limit
- `invoice_status != paid` with active publish
- MRR from `billing_accounts.contract_value` (manual until Stripe)

---

*Phase B code is implemented locally; apply migration on obelisk-core before enabling in production. No commit until review.*
