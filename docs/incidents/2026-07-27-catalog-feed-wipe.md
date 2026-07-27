# Incident Report: Overnight Catalog Wipe / Unreliable Shopping Surface

**Status:** **P0 ACTIVE** — fastest safe recovery in progress (mass reactivation of existing rows). Nightly feed cron **disabled**.  
**Date:** 2026-07-26 → 2026-07-27  
**Severity:** P0 production (customer-facing catalog integrity)

---

## Decision (2026-07-27 evening) — recovery path chosen

**Not continuing 12/165 FTP catch-up as primary restore.**

| Option | Verdict |
|--------|---------|
| A. Continue feed catch-up 12→165 | **Rejected as primary** — multi-day, does not instantly restore flags |
| B. Snapshot rollback script | **Insufficient** — LKG is count metadata only (`displayable: null`); cap 5k |
| C. Full DB PITR / physical restore | **Rejected** — PITR off; risks user tables; slower |
| D. Catalog-tables-only from backup | Slower than flag repair; rows still present |
| **E. Mass reactivate existing rows** | **SELECTED** — products were soft-deactivated, not deleted (~1.6M rows remain; ~192k eligible inactive with composition+NFP) |

**Why E:** Fastest path that restores shoppability without rewriting user data. Feed catch-up can run later for freshness only, after immutability guarantees ship.

---

## Exact root cause

Stacked failure — not a single DELETE:

1. **Nightly GHA cron** (`rakuten-feed-sync.yml`, 02:00 UTC) writes **directly to production** `products`.
2. **OOM** on `50739_4668007_mp.xml.gz` stuck checkpoint ~11–12/165.
3. **Before sync-safety:** re-upserts could overwrite `approved` / `is_active` / `is_displayable`.
4. **`markInactive` / sold-out deactivation** could shrink the live catalog after incomplete cycles — **no staging, no immutable live set, no automatic rollback**.
5. **`catalog_last_known_good` stored a count, not row data** — no instant restore snapshot existed.
6. **PITR disabled**; no operable catalog-only backup restore path in app code.

**Rule violated:** A broken feed delayed (and distorted) the store; it must never erase or silently downgrade the existing catalog.

---

## Immediate containment (executed)

- [x] GitHub Actions workflow **disabled** (schedule off)
- [x] `markInactive` hard-gated behind `CATALOG_ALLOW_MARK_INACTIVE=1` (default off)
- [x] Workflow YAML schedule commented out
- [x] Mass restore job running against eligible inactive in-stock products
- [x] Partial displayable indexes restored for browse
- [ ] Full index rebuild remaining (after restore)
- [ ] Row-level snapshot table migration applied
- [ ] Staging → validate → promote pipeline

---

## Safeguards already on main (pre-P0 escalate)

Curated-field preserve, 21-day grace, 5% drop abort, deactivation caps, sync lock, `catalog_sync_runs` — **necessary but not sufficient**. Production still lacked staging promote + real snapshots.

---

## Definition of done

- [ ] Customer-facing catalog restored to pre-incident coverage (brands/merchants/displayable)
- [ ] Nightly cron remains disabled until staging promote ships
- [ ] Row-level LKG snapshot taken and verified restorable
- [ ] Automatic rollback on product/merchant/brand threshold breach
- [ ] One clean feed cycle that cannot shrink live catalog
