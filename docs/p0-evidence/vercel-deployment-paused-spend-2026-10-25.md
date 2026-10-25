# Vercel `DEPLOYMENT_PAUSED` — spend budget (2026-10-25)

## Signal

`https://www.intertexe.com/*` returns **503** with body:

```text
The deployment is currently unavailable
DEPLOYMENT_PAUSED
```

This is **not** organic traffic overload. Vercel paused Production after the account/project **spend limit** was hit (Fluid Provisioned Memory + related usage from earlier Supabase hang / cron surface area).

## Why “low traffic” still burned budget

Fluid **Provisioned Memory** bills for wall-clock while serverless requests wait on Supabase I/O — including slow catalog RPCs and hung Postgres — even when Active CPU and visitor counts look low.

## Immediate operator steps (site online again)

1. Vercel → Billing / Spending → raise or clear the hard pause limit → **Unpause** Production.
2. Prefer **soft alerts** for Production (email when nearing budget). A hard pause will take the storefront offline again.
3. Production env:
   - `WARM_CRON_ENABLED=0`
   - `EXPENSIVE_BACKGROUND_JOBS_ENABLED=0`
   - `BACKGROUND_JOBS_ENABLED=0` (optional emergency; all crons already unscheduled in code)

## Code containment (this change)

- `vercel.json` crons → **empty** (baseline v7)
- All registry jobs `scheduledInProduction: false`
- Prior containment remains: Supabase 8s fetch timeout; expensive catalog jobs already off; Rakuten GHA schedule paused

## Re-enable path

After soft alerts are configured and spend is stable for several days, re-schedule **one** non-expensive job at a time (bump `APPROVED_CRON_BASELINE`), never restore `/api/cron/warm`.
