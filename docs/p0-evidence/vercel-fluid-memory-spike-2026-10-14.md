# Vercel Fluid usage spike — 2026-10-14

## Signal

Founder billing alert for `khiteri's projects`:

- **Fluid Provisioned Memory +426%** (1.44K GB-hrs / ~$15.23 vs prior ~$2.90 at same point in cycle)
- **Fluid Active CPU +139%**
- Billing cycle ~56% complete (ends 2026-10-27)

## Cause (evidence-aligned)

1. Consumer Supabase (`burrylupizvggupsryuj`) spent days on **Nano / Unhealthy**. Storefront and API routes waited on Postgres until Vercel `maxDuration` (often 10–15s+). Fluid **Provisioned Memory bills I/O wait**.
2. Concurrent shoppers + health probes + any still-scheduled catalog crons stacked overlapping isolates.
3. Historical warm fan-out was already removed (see `vercel-fluid-memory-incident-2026-08-02.md`); this spike is primarily **hung DB wall-clock**, amplified by remaining cron surface area.

## Containment shipped

1. Hard `SUPABASE_FETCH_TIMEOUT_MS` (default 8s) on consumer Supabase clients (`lib/supabase-fetch.ts`).
2. Lowered storefront `maxDuration` caps (`/api/health`, `/api/products`, `/api/catalog/stats`).
3. Unscheduled expensive catalog/revenue crons from `vercel.json` (registry baseline v6).
4. Reduced Gmail outreach sync from hourly → every 6 hours.
5. Warm remains unscheduled; `WARM_CRON_ENABLED` / `EXPENSIVE_BACKGROUND_JOBS_ENABLED` default **off**.

## Operator checklist (Vercel)

Confirm Production env:

- `WARM_CRON_ENABLED=0` (or unset)
- `EXPENSIVE_BACKGROUND_JOBS_ENABLED=0` (or unset)
- Do **not** re-add `/api/cron/warm` to project crons

## Re-enable path

Only after Supabase status is **Healthy** on **Small+** compute for several stable days:

1. Set `EXPENSIVE_BACKGROUND_JOBS_ENABLED=1` if classify/stats are needed.
2. Re-schedule one expensive job at a time via registry + `vercel.json` (bump `APPROVED_CRON_BASELINE`).
3. Watch Founder Dashboard → Operations / cost snapshot for longest job durations.
