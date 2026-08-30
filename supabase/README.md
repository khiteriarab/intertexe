# Supabase in this repository

There are **two** Supabase projects. They must stay separate.

## Consumer + Founder HQ

- Project: `intertexe` (`burrylupizvggupsryuj`)
- Migrations: `supabase/migrations/` (HQ Chrome, contacts, etc.)
- Config: `supabase/config.toml`
- Used by `/dashboard` Founder HQ and the consumer product

### Applying consumer migrations

Production schema was often applied via `supabase db query --linked --file …`, which
left `supabase_migrations.schema_migrations` out of sync. **Do not blindly run
`supabase db push`** until history is repaired.

**One-time fix (already applied SQL on production):**

```bash
# 1) Unique timestamp per file (required — duplicate YYYYMMDD prefixes break db push)
node scripts/normalize-migration-timestamps.mjs --apply

# 2) Mark all local migrations as applied on linked remote
SUPABASE_ACCESS_TOKEN=... node scripts/repair-consumer-migration-history.mjs

# 3) Verify
npx supabase migration list --linked
npx supabase db push --linked   # should be a no-op
```

**New migrations going forward:**

```bash
npx supabase migration new my_change_name
# edit supabase/migrations/<unique_timestamp>_my_change_name.sql
npx supabase db push --linked
```

Or apply a single file without replaying history:

```bash
npx supabase db query --linked --file supabase/migrations/<file>.sql
npx supabase migration repair --status applied <timestamp> --linked
```

## Enterprise / DPP SaaS

- Project: `obelisk-core` (`dpiksashuqetyzrjogal`)
- Migrations: `enterprise/supabase/migrations/`
- Config: `enterprise/supabase/config.toml`
- Seed: `enterprise/supabase/seed.sql`

Enterprise schema lives under `enterprise/supabase` so HQ migrations are never
applied to obelisk-core and Enterprise tables are never applied to the consumer
database.
