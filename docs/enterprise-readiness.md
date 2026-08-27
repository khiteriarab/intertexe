# INTERTEXE Enterprise readiness (template)

Fill before inviting an external brand. Do not mark items complete from routes alone.

| Gate | Result | Evidence |
|---|---|---|
| Live tenant isolation (Org A ⊄ Org B products/files) | Pending re-run | `npm run test:enterprise` with `ENTERPRISE_ALLOW_LIVE_TESTS=true` |
| JWT RLS (user A cannot read org B) | Pending | `scripts/enterprise-permissions.live.test.ts` |
| Supplier assigned-only access | Pending | same live file |
| Read-only cannot mutate | Policy + unit test present; live JWT pending | `canMutateEnterprise` + live permissions |
| 500-row import | Pending re-run | isolation live test inserts 500 source rows |
| Source records immutable (UPDATE blocked) | Pending re-run | isolation live test |
| Customer-zero end-to-end Phase 1 | Not complete | Disposable-org journey exists; customer-zero UI not signed off |
| Public resolver `/p/[id]` | Partial | Implemented in code; live publish journey pending |
| Machine-readable `/p/[id]/json` | Partial | Public fields only |
| Published version retained after update | Pending live | Phase 1 live journey asserts v1 immutable |
| Organization deletion | Pending re-run | `execute_organization_deletion` |

## Outstanding Partial / Placeholder

From `lib/enterprise/page-states.ts`:

- Partial: overview, products, issues, passports, benchmarking (aggregates only), integrations, settings
- Placeholder: suppliers, regulations, analytics, developers, files, activity

## Not ready until

The first external brand can: upload → analyze → review → resolve → generate → publish → scan → update, with no fabricated backend values.

Do not move `/platform/demo` onto Demo Brand until that organization has 10 approved products processed through the same pipeline.
