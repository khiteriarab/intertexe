# Enterprise environments and data safety

## Projects (never mixed)

| Role | Project | Ref | Env vars |
|---|---|---|---|
| Consumer app + Founder HQ | intertexe | burrylupizvggupsryuj | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Enterprise customer data | obelisk-core | dpiksashuqetyzrjogal | `ENTERPRISE_SUPABASE_*` only |

`ENTERPRISE_SUPABASE_URL` must not equal `SUPABASE_URL`. The Enterprise client refuses that configuration.

## Deployment environments

Set explicitly:

```text
ENTERPRISE_DEPLOYMENT_ENV=local|staging|production
```

If unset:

- `VERCEL_ENV=production` → `production`
- `VERCEL_ENV=preview` → `staging`
- otherwise → `local`

Preview/staging must not point at unrestricted production customer data by default. Use a staging obelisk project, or set `ENTERPRISE_ALLOW_PRODUCTION_DATA=true` only with a written reason.

Live destructive tests require `ENTERPRISE_ALLOW_LIVE_TESTS=true` against a disposable database.

## Organization flags

| Flag | Meaning |
|---|---|
| `environment` | Which deployment class this org belongs to |
| `is_demo` | Dedicated demonstration tenant |
| `is_customer_zero` | INTERTEXE’s own catalog |
| `approved_for_public_demo` | Allowed on `/platform/demo` (requires `is_demo`) |
| `data_classification` | `public_demo`, `customer_confidential`, `internal`, `synthetic_test` |

Demo Brand, customer-zero, staging, and production customers must not be queried interchangeably.

## HQ references

Founder HQ may record Enterprise organization ID, slug, pilot status, and implementation status on `hq_deals`. That is a pointer, not a replica of the catalog.
