# INTERTEXE recovery runbook (Enterprise)

This documents **actual** restoration paths. It does not claim backups that the
current Supabase plan may not include.

## Accidental data deletion

1. Confirm whether the row is archived (`lifecycle = archived`) or deleted.
2. If deleted and PITR is enabled on obelisk-core, restore a point before the
   delete into a temporary database, then copy only the affected organization
   rows. Do not restore the entire production database over newer customer data
   without an impact review.
3. If PITR is not enabled, restore from the latest daily backup (paid plans) or
   accept that recovery is limited to what Git migrations + exports contain.

## Failed migration

1. Do not rewrite history of applied migrations.
2. Add a forward-fix migration in `enterprise/supabase/migrations/`.
3. Apply to staging first.
4. Record the new version in Git. Never change production schema only in the dashboard.

## Corrupted import

Source records are immutable. Do not update them in place.

1. Mark canonical products/issues created by the import for review.
2. Create a new import with a new idempotency key.
3. Reconcile by GTIN / SKU + organization / style + variant.
4. If the organization is a test org, `execute_organization_deletion` removes
   database rows. Storage objects must still be deleted by the app job.

## Restoration procedure

1. Snapshot current schema version (`supabase migration list` when CLI is linked).
2. Restore database copy using Supabase dashboard backup/PITR for obelisk-core.
3. Re-run any storage deletion/re-upload jobs as needed.
4. Verify tenant isolation with Brand A / Brand B accounts before serving customers.
