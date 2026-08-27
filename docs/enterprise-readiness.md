# INTERTEXE Enterprise readiness

Filled 27 Aug 2026 against obelisk-core (`dpiksashuqetyzrjogal`) and consumer HQ (`burrylupizvggupsryuj`). Do not mark items complete from routes alone.

| Gate | Result | Evidence |
|---|---|---|
| Live tenant isolation (Org A ⊄ Org B products/files) | Pass | `scripts/enterprise-isolation.live.test.ts` — disposable orgs, 500 source rows, deletion leftover = 0 |
| JWT RLS (user A cannot read org B) | Pass | `scripts/enterprise-permissions.live.test.ts` — owner A sees Secret A only; filtering B’s `organization_id` returns `[]` |
| Supplier assigned-only access | Pass | same file — supplier sees 0 products until a `supplier_requests` assignment, then only that product |
| Read-only cannot mutate | Pass | same file — `read_only` product insert is rejected by RLS; unit test `canMutateEnterprise` |
| 500-row import | Pass | isolation live test inserts 500 immutable `source_records` |
| Source records immutable (UPDATE blocked) | Pass | isolation live test — UPDATE `payload_hash` errors |
| Customer-zero end-to-end Phase 1 | Pass (signed-in APIs) | `scripts/enterprise-customer-zero-gate.ts` on org `intertexe`, SKU `CZ-E2E-mtbpp2qq`, product `72221264-06d9-4e54-9248-20c540b99141` |
| Public resolver `/p/[id]` | Pass | http://localhost:3000/p/itx_0f25424u1t1s2s072q2c — “Customer-zero oxford”, published version 2 |
| Machine-readable `/p/[id]/json` | Pass | `/p/itx_0f25424u1t1s2s072q2c/json` — public `name` + `composition` only |
| Published version retained after update | Pass | v1 and v2 rows present; UPDATE of published v1 is blocked. Locked composition was not silently overwritten on re-import (v2 snapshot still `100% Cotton`) |
| Organization deletion | Pass | isolation live test — `execute_organization_deletion` removes both fixture orgs |

## Migrations applied

- obelisk-core `013_environment_and_benchmarks.sql` — `organizations.environment` / `data_classification` present. Seed orgs: `intertexe` = internal customer-zero; `intertexe-demo` = public_demo. Recorded as `schema_migrations` version `013`.
- consumer HQ `20260827_hq_enterprise_org_refs.sql` — `hq_deals.enterprise_organization_id`, `enterprise_organization_slug`, `enterprise_pilot_status`, `enterprise_implementation_status`.

## Outstanding Partial / Placeholder

From `lib/enterprise/page-states.ts` (unchanged; a route is not “Implemented”):

- Partial: overview, products, issues, passports, benchmarking (aggregates only), integrations, settings
- Placeholder: suppliers, regulations, analytics, developers, files, activity

## Not ready until

The first **external** brand can: upload → analyze → review → resolve → generate → publish → scan → update, with no fabricated backend values.

Customer-zero used a temporary Enterprise Auth session against `/api/dashboard/org/intertexe/*` (not a founder HQ password in the browser). Repeat the same path in the dashboard UI before inviting a third-party brand.

Do not move `/platform/demo` onto Demo Brand until that organization has 10 approved products processed through the same pipeline.
