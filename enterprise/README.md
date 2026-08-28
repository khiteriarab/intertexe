# INTERTEXE Enterprise backend (obelisk-core)

This directory is the version-controlled schema for the **Enterprise / DPP SaaS**
Supabase project. It is **not** the consumer app or Founder HQ database.

| Project | Ref | Code |
|---|---|---|
| Consumer + Founder HQ | `burrylupizvggupsryuj` | `/supabase/migrations` |
| Enterprise (obelisk-core) | `dpiksashuqetyzrjogal` | `/enterprise/supabase` |

Never apply these migrations to the consumer project. Never fall back
`ENTERPRISE_SUPABASE_*` to consumer `SUPABASE_*` keys.

## Environment

Required in local/dev, preview, and production **separately**:

```text
ENTERPRISE_SUPABASE_URL=
ENTERPRISE_SUPABASE_ANON_KEY=
ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY=
```

Optional:

```text
NEXT_PUBLIC_ENTERPRISE_SUPABASE_ANON_KEY=
ENTERPRISE_ALLOW_LIVE_TESTS=false
ENTERPRISE_DEPLOYMENT_ENV=local
```

Do not commit service-role keys, database passwords, or access tokens.

Preview deployments must not point at unrestricted production Enterprise data
by default. Use a staging Supabase project or a restricted branch database.

## Apply migrations

When the Supabase CLI is authenticated against obelisk-core:

```bash
npx supabase link --project-ref dpiksashuqetyzrjogal --workdir enterprise/supabase
npx supabase db push --workdir enterprise/supabase
npx supabase db query --workdir enterprise/supabase -f enterprise/supabase/seed.sql
```

If the CLI is unavailable, apply `migrations/*.sql` then `seed.sql` through the
Supabase SQL editor or Management API for **obelisk-core only**.

Seed creates:

- **INTERTEXE** (`intertexe`) — customer zero
- **INTERTEXE Demo Brand** (`intertexe-demo`) — public demonstration org

Seed does not include confidential catalog rows or auth users.

## Backup

Supabase project backups follow the plan attached to obelisk-core (daily backups
on paid plans; point-in-time recovery where the plan includes it). This repo
does not implement a custom backup agent. See `docs/enterprise-recovery.md`.
