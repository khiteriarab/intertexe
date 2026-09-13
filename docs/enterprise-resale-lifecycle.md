# INTERTEXE resale lifecycle architecture

INTERTEXE is **lifecycle infrastructure**, not a marketplace. A physical product moves through manufacturing → ownership → valuation → next owner, with INTERTEXE as the invisible intelligence layer underneath brand interfaces.

## Five connected layers

1. **Product creation / manufacturing** — Canonical product record (composition, supplier data, certifications, DPP fields, serial/QR).
2. **Consumer ownership** — Passport follows the item inside brand apps (white-label). Shows care, repairs, ownership history, **estimated resale value**.
3. **Resale intelligence** — Estimated value, value retention, market demand, typical selling time, best channel. Feeds brand dashboards (residual value analytics over time).
4. **Resale session** — Consumer chooses a route; authorizes their own marketplace account; INTERTEXE generates a verified listing draft.
5. **Ownership transfer** — Sale writes back to lifecycle: sale price, channel, value retention, owner count; passport continues.

## Two APIs (separation of concerns)

### Brand Product API

Used by brand software for:

- Product passport / DPP data
- Lifecycle status
- `resaleEligible`, resale intelligence (value, retention, demand)
- **`POST /api/dashboard/org/{org}/resale/sessions`** — create a resale session, receive `sessionId` + `sellUrl`

The brand **never** receives or controls consumer marketplace credentials.

### Consumer Resale Orchestration API

Used during an active resale session:

- `POST /api/resale/sessions` — start session (optional auth until publish)
- `GET /api/resale/sessions/{sessionId}` — valuation, routes, listing draft
- Consumer OAuth to eBay / partners (existing marketplace connections)
- `POST /api/resale/items` — publish verified listing; links session → item
- Sale webhooks → ownership transfer + lifecycle events

## Resale routes (not “highest bidder everywhere”)

| Route | UX |
|-------|-----|
| **Marketplace listing** | INTERTEXE prepares draft; consumer publishes to connected marketplace |
| **Instant buyout / trade-in** | Partner offers compared (Kayak-for-resale) |
| **Consignment** | Estimated payout, commission, time-to-sale |
| **Brand trade-in** | Store credit option |

UI centers on **Resale Value** and **Best Resale Route**, not “post everywhere.”

## Schema

- `027_resale_orchestration.sql` — items, listings, connections, lifecycle events
- `029_resale_sessions.sql` — temporary sessions + compared routes

## White-label flow

```
Brand app → POST create session → sessionId
Consumer → /p/{id}/sell?session={sessionId}
INTERTEXE → routes + listing draft + OAuth → marketplace
Sale → lifecycle writeback → passport continues
```
