# Supabase in this repository

There are **two** Supabase projects. They must stay separate.

## Consumer + Founder HQ

- Project: `intertexe` (`burrylupizvggupsryuj`)
- Migrations: `supabase/migrations/` (HQ Chrome, contacts, etc.)
- Used by `/dashboard` Founder HQ and the consumer product

## Enterprise / DPP SaaS

- Project: `obelisk-core` (`dpiksashuqetyzrjogal`)
- Migrations: `enterprise/supabase/migrations/`
- Config: `enterprise/supabase/config.toml`
- Seed: `enterprise/supabase/seed.sql`

Enterprise schema lives under `enterprise/supabase` so HQ migrations are never
applied to obelisk-core and Enterprise tables are never applied to the consumer
database.
