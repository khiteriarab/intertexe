# Background Jobs — Permanent Engineering Standard

**Status:** Mandatory for all INTERTEXE production deployments  
**Effective:** 2026-08-02 (post Fluid Provisioned Memory incident)

## Rules

1. **Registry is law.** Every cron/scheduled job must be declared in [`lib/background-jobs/registry.ts`](../lib/background-jobs/registry.ts) with:
   - purpose, owner, schedule
   - estimated runtime + expected daily/monthly executions
   - justification
   - productionSafe + scheduledInProduction

2. **Cost review is required.** CI / `npm run build` fails unless those fields exist. High-frequency jobs (>2000 invocations/month) require founder review and will fail the gate.

3. **Warming policy.** Only `/api/health` may ever be warmed. Catalog, sale, scan, recommend, shop, search, homepage, designers, and products APIs are forbidden. See [`lib/background-jobs/warm-policy.ts`](../lib/background-jobs/warm-policy.ts).

4. **Environment protection.** `WARM_CRON_ENABLED` defaults to `0`. Production warm requires explicit manual opt-in. Warm is **not** in `vercel.json`.

5. **Deployment checklist (automatic).** `npm run check:background-jobs` runs on every Vercel build (`npm run build`) and on GitHub Actions via [`.github/workflows/background-jobs-gate.yml`](../.github/workflows/background-jobs-gate.yml) (`pull_request` + `push` to `main`). It verifies:
   - no unregistered / new crons vs registry
   - no increased high-frequency schedules
   - no background `setInterval` / unbounded loops in cron routes
   - no overlapping schedule stacks (>3 jobs same minute)
   - no expensive warming endpoints

   Template copy also kept at [`docs/BACKGROUND_JOBS_GATE.workflow.yml`](./BACKGROUND_JOBS_GATE.workflow.yml).

6. **Founder Dashboard.** Product → Background Jobs panel shows every registered job, schedule, last/next run, durations, failures, and enabled status.

## How to add a job (correct process)

1. Add a complete entry to `BACKGROUND_JOBS` in the registry.
2. Mirror the schedule in `vercel.json` **only** by keeping registry + vercel in sync (the check script diffs them).
3. Run `npm run check:background-jobs` locally.
4. Bump `APPROVED_CRON_BASELINE.updatedAt` / note if this is an intentional production schedule change.
5. Document justification for frequency and expected Fluid cost impact.
6. Prefer GitHub Actions / external workers for FTP, feed ingest, and multi-minute batch work.

## Kill switches

| Env | Default | Effect |
|---|---|---|
| `WARM_CRON_ENABLED` | `0` | Must be `1` to run warm at all |
| `BACKGROUND_JOBS_ENABLED` | `1` | Master off switch |
| `EXPENSIVE_BACKGROUND_JOBS_ENABLED` | `1` | Disables expensive registry jobs |
| `VERCEL_MONTHLY_BUDGET_USD` | `30` | Dashboard / Action Center budget |

## Incident reference

See [`docs/p0-evidence/vercel-fluid-memory-incident-2026-08-02.md`](./p0-evidence/vercel-fluid-memory-incident-2026-08-02.md).
