# Production catalog safety

## What must never run unattended against live `public.products`

- `fix_synthetic_nfp_mismatch_batch`
- `fix_synthetic_nfp_mismatch_id_batch`
- `restore_is_displayable_batch`
- Any script loop that `UPDATE`s hundreds of thousands of product rows

These batch jobs scan or touch large fractions of the 1M+ row catalog and can overload Postgres, causing catalog RPC timeouts and empty app grids while counts still look fine.

## Default posture (production)

1. **Database** — batch repair functions raise an exception and have `EXECUTE` revoked from `service_role` (migrations `20260831140000`, `20260831150000`).
2. **App** — `/api/cron/nfp-backfill` returns 403 unless `CATALOG_BULK_MUTATIONS_ENABLED=true`.
3. **Scripts** — all `scripts/run-nfp-*` and `scripts/emergency-restore-*` exit unless `CATALOG_BULK_MUTATIONS_ENABLED=true`.

Normal merchant feed ingest is unaffected: per-row `update_is_displayable` still runs on individual writes.

## Maintenance window only

To run a batch repair:

1. Announce maintenance window.
2. Set `CATALOG_BULK_MUTATIONS_ENABLED=true` in Vercel (temporary).
3. Restore function bodies from the source migrations listed in `20260831150000`.
4. `GRANT EXECUTE ... TO service_role` for the functions being used.
5. Run the smallest batch size that completes under 30s.
6. Re-apply `20260831150000` when done.
7. Unset `CATALOG_BULK_MUTATIONS_ENABLED`.

## Agent / automation rule

**Do not** apply migrations that mass-update `products`, start NFP backfill loops, or run Management API batch SQL against production without explicit user approval in the same session.
