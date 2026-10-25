# Vercel spend — site must never go down

**Rule:** Soft alerts only. Never use a Vercel **hard spend pause** on Production. Hard pause = `DEPLOYMENT_PAUSED` = website offline.

## Why the Oct 2026 limit was hit (not “web traffic”)

Vercel Fluid **Provisioned Memory** bills for wall-clock while serverless functions wait on Supabase — including I/O wait. Visitor counts can be low while GB-hrs are high.

### Primary burn (early–mid October)

Supabase consumer DB was **Nano / Unhealthy**. Storefront and API routes waited until `maxDuration` (~10–15s). That wall-clock is what inflated Fluid Provisioned Memory (**~$15 MTD by 14 Oct**, +426% vs prior cycle).

### Cron amplifiers (scheduled before containment)

These were in `vercel.json` **before** PR #150 / #152. If `EXPENSIVE_BACKGROUND_JOBS_ENABLED=1`, the expensive ones ran full scans; if `=0`, they still invoked briefly then skipped (small cost). Light jobs always ran.

| Cron | Schedule (old) | Risk |
|------|----------------|------|
| `/api/cron/daily-catalog-refresh` | daily 03:00 | **High** — classify batches up to ~90s (expensive) |
| `/api/cron/sync-designers` | daily 04:00 | **High** — full catalog page scans (expensive) |
| `/api/cron/data-health` | daily 06:00 | **High** — exact `count(*)` on live catalog (expensive) |
| `/api/cron/catalog-promote-verify` | daily 05:30 | **High** — smoke/RPC walks (expensive) |
| `/api/cron/refresh-catalog-stats` | weekly | **High** — stats rebuild (expensive) |
| `/api/cron/rakuten-revenue-pull` | 2× daily | **High** — FTP/API waits bill memory (expensive) |
| `/api/cron/gmail-outreach-sync` | hourly → then 6h | Medium — frequent invocations |
| `/api/cron/cost-observability` | every 6h | Low–medium |
| `/api/cron/hq-integrations-sync` | daily | Medium |
| `/api/cron/lifecycle-checkpoints` | daily | Medium |
| `/api/cron/scan-followup` | daily | Medium |
| `/api/notifications/price-drops` | daily | Medium |
| `/api/cron/push-dispatch` | daily | Low |
| weekly-edit / hq-weekly-briefing | weekly | Low |

**Historical note:** Aug 2026 spike was dominated by `/api/cron/warm` every 2 minutes fanning out to catalog/sale/scan. Warm is **banned** and unscheduled.

### Residual burn after partial containment (20–25 Oct)

Even with expensive crons off, every real `/shop` and `/api/products` call still billed Fluid for ~0.5–5s of Postgres wait. That added to the **same monthly total** that was already high from the unhealthy-DB period → hard pause.

## Hard guarantees now (code)

1. **`vercel.json` → `"crons": []`** — zero scheduled background jobs (baseline v7).
2. Registry: every job `scheduledInProduction: false` — CI fails if a cron is added without review.
3. `WARM_CRON_ENABLED` defaults **off**; warm not scheduled.
4. `EXPENSIVE_BACKGROUND_JOBS_ENABLED` defaults **off**.
5. Supabase client **8s fetch timeout** — hung DB cannot hold instances until long maxDuration.
6. Nightly Rakuten feed GitHub Action schedule **paused**.
7. Google Merchant feed `maxDuration` capped (no 300s open-ended crawl on Fluid).

## Hard guarantees you must keep in Vercel (billing)

| Setting | Required value |
|---------|----------------|
| Production spend **hard pause** | **OFF** (use soft/email alerts only) |
| Soft alert | e.g. $20 / $30 / $40 — notify, do not pause |
| `WARM_CRON_ENABLED` | `0` or unset |
| `EXPENSIVE_BACKGROUND_JOBS_ENABLED` | `0` or unset |
| Do not re-add | `/api/cron/warm` or expensive catalog crons |

Code cannot turn off Vercel’s hard pause. If hard pause stays on, the site **can** go down again when any accrued monthly Fluid crosses the dollar line — even with low traffic.

## Re-enabling work later

1. Soft alerts confirmed; hard pause off.
2. Supabase Healthy on Small+.
3. Re-add **one** non-expensive cron via registry + `vercel.json` in the same PR (bump `APPROVED_CRON_BASELINE`).
4. Never restore warm fan-out.
