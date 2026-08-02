# P0 Vercel Fluid Provisioned Memory Incident — Evidence

Date investigated: 2026-08-02  
Project: `intertexe` (`prj_4FVDA4I8VzPpTC05qH3ebhmXVwD6`) serving `www.intertexe.com`  
Team: `khiteris-projects` (`team_mQbf2d3ik9Jsb68DCJbRA3qC`)

## Invoice facts (from founder)

- Unexpected invoice ≈ **$110.99** (expected ≈ **$20**)
- Dominant line item: **Fluid Provisioned Memory ≈ $92.52**
- Prior period Fluid Provisioned Memory ≈ **$5.67**
- Active CPU and ordinary traffic remained comparatively small

## Billing mechanics (Vercel docs)

From https://vercel.com/docs/pricing/serverless-functions :

- **Active CPU** does **not** bill during I/O wait.
- **Provisioned Memory** **does** bill for the entire instance lifetime while requests are in flight, including I/O wait.

That matches the invoice shape: high provisioned memory, low CPU.

## Observability evidence (production, trailing 24h)

Source: Vercel MCP `get_runtime_logs` grouped by `requestPath`  
Window: 2026-08-01 → 2026-08-02

| requestPath | count |
|---|---|
| `/api/catalog` | **6476** |
| `/api/scan` | **719** |
| `/api/sale` | **719** |
| `/api/cron/warm` | **718** |
| `/` (homepage) | 111 |
| `/shop` | 36 |

Expected warm schedule `*/2 * * * *` ⇒ **720**/day. Observed **718**.

Warm route fan-out (code before containment) hit **9 catalog variants + sale + scan = 11 targets**.

Arithmetic check:

- `718 × 9 = 6462` ≈ observed catalog **6476**
- `718` ≈ observed sale **719** and scan **719**

**Conclusion:** nearly all production serverless volume for catalog/sale/scan was synthetic warm traffic, not organic shoppers.

## Causal code change

Commit `fa46486` (2026-06-02) — *“aggressive warming”*:

- Expanded `/api/cron/warm` from 2 light routes (`limit=1`) to **11 heavy routes** (`limit=48`)
- Kept schedule **every 2 minutes**
- Used `Promise.all(fetch(...))` with **no AbortSignal / timeout**

Live duration probe (2026-08-02): warm targets returned **0.7s–13.3s** sequentially; collection=vacation alone **13.3s**. During slower catalog periods, warm’s unbounded waits keep many Fluid instances provisioned concurrently — exactly the provisioned-memory failure mode.

## Root cause (evidence-based)

**Primary:** `/api/cron/warm` every 2 minutes fanning out to `/api/catalog`, `/api/sale`, and `/api/scan`, holding provisioned memory during Supabase/HTTP I/O.

**Secondary amplifiers (contained):**

- `/api/cron/daily-catalog-refresh` previously `maxDuration=300` with up to **400** classify rounds
- `/api/cron/catalog-promote-verify` `maxDuration=300`
- `/api/cron/rakuten-revenue-pull` FTP/API waits up to 120s, twice daily

Rakuten **feed ingest** was already removed from `vercel.json` (monitoring-only / GitHub Actions path) and was **not** the 24h invocation majority.

## Immediate containment applied

1. **Removed** `/api/cron/warm` from `vercel.json` (no longer scheduled)
2. Warm route defaults to **skipped** unless `WARM_CRON_ENABLED=1`
3. Hard fetch timeouts + exclusive job locks in `lib/job-guard.ts`
4. Daily classify capped (default max 40 rounds, 90s hard stop, `maxDuration=120`)
5. Promote-verify + revenue-pull locked/capped and gated by `EXPENSIVE_BACKGROUND_JOBS_ENABLED`
6. Kill switches: `BACKGROUND_JOBS_ENABLED`, `EXPENSIVE_BACKGROUND_JOBS_ENABLED`, `WARM_CRON_ENABLED`
7. Founder Dashboard → Product: **Infrastructure / Cost** section + Action Center cost alerts
8. Cron `/api/cron/cost-observability` every 6h writes `vercel_cost_snapshot`

## Estimated monthly cost after remediation

Using remaining scheduled crons only (warm eliminated):

- Warm previously: ~21,600 invocations/month × ~11 fan-outs ≈ **~237k synthetic function invocations/month removed**
- Remaining background wall-clock is on the order of minutes–tens of minutes/day, not continuous overlap

At iad1 provisioned-memory rate **$0.0106 / GB-hr**, returning to the prior-period band of **≈ $5–$20 Fluid Provisioned Memory** (plus Pro base) is the evidence-aligned expectation once warm is unscheduled. Exact invoice dollars still require Vercel’s billing UI (no public Fluid line-item API available to this app).

## Proof checklist after deploy

1. Vercel project crons: `/api/cron/warm` absent
2. Trailing 24h logs: `/api/cron/warm` ≈ 0; `/api/catalog` no longer ≈ 9× warm
3. `system_status.vercel_cost_snapshot.killSwitches.warmCronScheduled === false`
4. No active `job_lock:*` older than maxAge

## Remediation status

**Remediated (2026-08-02).** Warm cron unscheduled; kill switches + job locks live; Founder Dashboard cost + background-jobs panels shipped. No further warming behavior changes without documented business need and explicit approval.

## Final governance — Background Job Cost Gate

Permanent standard: [`docs/BACKGROUND_JOBS_STANDARD.md`](../BACKGROUND_JOBS_STANDARD.md)

### Enforcement surfaces

1. **Vercel production builds** — `package.json` runs `npm run check:background-jobs` before `next build`. A failing gate aborts the deployment.
2. **GitHub Actions** — `.github/workflows/background-jobs-gate.yml` (installed from `docs/BACKGROUND_JOBS_GATE.workflow.yml`) runs on:
   - `pull_request` (path-filtered to cron/registry/package changes)
   - `push` to `main` (same path filters)
   - Steps: `npm run check:background-jobs` + `npm run test:background-jobs`

### Negative-test evidence (local, same checker Vercel/CI invoke)

Directory: [`docs/p0-evidence/background-jobs-gate-2026-08-02/`](./background-jobs-gate-2026-08-02/)

| Violation | Result | Evidence file |
|---|---|---|
| Undeclared cron added to `vercel.json` | **FAIL** exit 1 | `01-undeclared-cron.txt` |
| Cron frequency increased (registry mismatch) | **FAIL** exit 1 | `02-increased-frequency.txt` |
| Monthly invocations above founder ceiling | **FAIL** exit 1 | `02b-high-frequency-policy.txt` |
| Forbidden high-frequency schedule `*/2 * * * *` | **FAIL** exit 1 | `02c-schedule-string-policy.txt` |
| Expensive route added to warming (`/api/catalog`) | **FAIL** exit 1 | `03-expensive-warm.txt` |
| Registry cost metadata / justification missing | **FAIL** exit 1 | `04-missing-cost-metadata.txt` |
| Clean tree (control) | **PASS** exit 0 | `00-clean-pass.txt` |
| Unit tests | **PASS** exit 0 | `00-unit-tests.txt` |

Summary: [`background-jobs-gate-2026-08-02/SUMMARY.md`](./background-jobs-gate-2026-08-02/SUMMARY.md)

### GitHub workflow install status

- **Installed on main** (2026-08-02): `.github/workflows/background-jobs-gate.yml`
- Commit: `5de97858c4ebf2cebbf1269f878aa6405a1be76b`
- Triggers: `pull_request` + `push` to `main` (path-filtered)
- Runs: `npm run check:background-jobs` and `npm run test:background-jobs`
- Vercel build gate remains active in parallel

