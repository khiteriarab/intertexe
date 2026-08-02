# Background Job Gate — Negative Test Evidence (2026-08-02)

Control and violation cases for `npm run check:background-jobs` (also invoked by `npm run build` on Vercel).

| Case | File | Exit | Observed FAIL |
|---|---|---:|---|
| Clean pass | `00-clean-pass.txt` | 0 | OK — 17 production crons |
| Unit tests | `00-unit-tests.txt` | 0 | 5 pass |
| Undeclared cron in vercel.json | `01-undeclared-cron.txt` | 1 | vercel.json ≠ registry |
| Frequency change (mismatch) | `02-increased-frequency.txt` | 1 | vercel.json ≠ registry |
| High monthly invocations | `02b-high-frequency-policy.txt` | 1 | exceeds 2000/mo founder ceiling |
| Forbidden schedule `*/2` | `02c-schedule-string-policy.txt` | 1 | more frequent than every 6 hours |
| Expensive warm target | `03-expensive-warm.txt` | 1 | forbidden `/api/catalog` |
| Missing cost justification | `04-missing-cost-metadata.txt` | 1 | justification min 20 chars |

**Vercel enforcement:** `package.json` → `"build": "npm run check:background-jobs && next build"` — any of the FAIL cases above abort production builds.

**GitHub Actions:** `.github/workflows/background-jobs-gate.yml` runs the same check on `pull_request` and `push` to `main` (path-filtered to cron/registry/package changes).
