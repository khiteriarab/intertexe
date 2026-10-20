# Supabase advisor: `rls_disabled_in_public` — 2026-10-20

## Signal

Founder email from Supabase (issues as of **17 Oct 2026**):

- **CRITICAL** — Table publicly accessible (`rls_disabled_in_public`)
- Anyone with the project URL (and published anon key) could read/edit/delete rows in tables without RLS.

Project: consumer catalog **intertexe** (`burrylupizvggupsryuj`).

## Root cause

Several high-traffic `public` tables never received `ENABLE ROW LEVEL SECURITY` in `supabase/migrations/` (notably `products`, `designers`, `users`, `system_status`, feed/catalog helpers). An older root script `supabase-rls-policies.sql` was incomplete and used `USING (true)` write policies — not safe as a fix.

## Fix

Migration: `supabase/migrations/20261020180000_fix_rls_disabled_in_public.sql`

- Enable + FORCE RLS on catalog, user-owned, and internal tables
- Public **SELECT** only for catalog surfaces
- Own-row policies for user tables
- Internal/HQ/ops tables: RLS on, no anon/authenticated policies + REVOKE
- `barcode_compositions`: SELECT/INSERT/UPDATE for clients (scanner upsert), no DELETE
- Catch-all enables RLS on any remaining public base table

`service_role` continues to bypass RLS for server/cron paths.

## Apply

1. Run the migration SQL in Supabase SQL Editor (or Management API).
2. Verify: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity;` → empty
3. Advisors → Security: `rls_disabled_in_public` cleared
4. Smoke shop + iOS auth/favorites

## Not a false alarm

This was **not** okay to ignore. Catalog being world-readable is intentional; **world-writable** `products` / `system_status` is not.
