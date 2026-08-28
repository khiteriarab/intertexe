# INTERTEXE Enterprise readiness

Filled 27 Aug 2026 against obelisk-core (`dpiksashuqetyzrjogal`) and consumer HQ (`burrylupizvggupsryuj`). Do not mark items complete from routes alone.

Identity architecture: **Phase 1 implemented.** See `docs/enterprise-identity.md`. Two Auth projects, UUID `enterprise_identity_links`, 15-minute revocable handoff JWT, org data plane on the user JWT (RLS). Email is not authorization.

## External-brand simulated acceptance (27 Aug 2026)

This is the first true external-brand gate: Enterprise Auth only, no HQ user, no `enterprise_identity_links` row, no `intertexe` membership, no service-role dashboard data plane.

| Field | Value |
|---|---|
| Organization | **Atlas Atelier** (`atlas-atelier`, `df749d5a-66d9-4eaa-9cbe-52d3bef45117`) |
| Plan | `founding_pilot` |
| Kind / classification | customer / `synthetic_test` / local |
| Test user | `maya@atlas-atelier.example.invalid` (Maya Chen) |
| Role | **`product_manager`** (minimum mutate role; not owner/admin) |
| HQ identity | None |
| Identity links | 0 |
| Memberships | `atlas-atelier` only |
| Dataset | 10 CSV rows (`scripts/fixtures/atlas-atelier-10-products.csv`) |
| Canonical products | **10** (ATL-DRS-008 and ATL-DRS-009 kept separate; shared GTIN `5601234567890` is an explicit ambiguous collision, not a silent merge) |
| Eligible published product | Atlantic Oxford Shirt `ATL-OXF-001` `b7dd87e0-a2e1-4312-aac8-35a52ae29fc1` |
| Passport | `itx_66236d2s2p0j386v0a5m` **v1 + v2** |

### Workflow steps

| Step | Result | Evidence |
|---|---|---|
| login | **Pass** | Brand password → `/dashboard/atlas-atelier`. No HQ session. |
| organization | **Pass** | Shell shows Atlas Atelier, `PRODUCT MANAGER · FOUNDING PILOT`. Switcher hidden (single org). |
| upload | **Pass** | Pasted 10-row CSV in Products. |
| column mapping | **Pass** | High-confidence auto-suggest for Style No, SKU, Product Name, GTIN, Color, Category, Composition, Country of Origin. Notes and Season stayed **Ignore**. Confirm still required. |
| import preview | **Pass** | Row counts shown before commit. Empty `{}` mapping no longer wipes suggestions. |
| preserve immutable source | **Pass** | Oxford has 2 `source_records`. UPDATE `payload_hash` errors: `source_records are immutable`. |
| normalize | **Pass** | Original retained. Spandex → `95% Cotton / 5% Elastane`. Shell/lining → `100% Linen` with lining explanation (not added into the shell total). Blend → `80% Cotton / 20% Polyester`. |
| validate | **Pass** | See issues below. |
| issues | **Pass** | Expected issues created; they block publishability until resolved. |
| review/approve | **Pass** | Reason required (≥8 chars). `reviewer_id`, `updated_at`, original vs normalized, activity `product:{id} \| reason: …`, audit `previous_ref` / `resulting_ref`. |
| DPP readiness | **Pass** | Incomplete products stay **Not ready**. Eligible product can reach ready only with identity, composition, origin, no open high/critical issues, and approval. |
| passport preview | **Pass** | Product page “Passport preview” lists public fields before publish. |
| publish | **Pass** | Oxford v1 from the dashboard UI. |
| QR / public resolver | **Pass** | `/p/itx_66236d2s2p0j386v0a5m` remains resolvable after later source update (`update_required` still serves the last published version). |
| machine-readable | **Pass** | `/p/itx_66236d2s2p0j386v0a5m/json` v1 was `100% Cotton`; v2 is `98% Cotton / 2% Elastane`. |
| update source | **Pass** | Second CSV; second immutable source row. |
| reconcile | **Pass** | Issue `Locked composition differs from new source` (high). Incoming value applied only after Resolve; re-approval required. |
| version | **Pass** | v2 published as the same `product_manager` user JWT. v1 row immutable (`published passport versions are immutable`). Public JSON version 2. |

### The 15 verifications

| # | Check | Result |
|---|---|---|
| 1 | Brand login does not expose HQ | **Pass** — `/dashboard` redirects to Atlas; no “Private operating system” / “This week” |
| 2 | Brand user sees only its own organization | **Pass** — `/dashboard/intertexe` 404; JWT `organization_id=intertexe` returns `[]`; own SKUs visible |
| 3 | Upload and mapping understandable without founder | **Pass** — high-confidence SKU/name/composition suggested; ambiguous columns stay Ignore |
| 4 | Source records remain immutable | **Pass** |
| 5 | Normalization retains provenance | **Pass** — original `100% Cotton` kept until conflict accept |
| 6 | Deterministic validation creates expected issues | **Pass** (see below) |
| 7 | Review records editor, reason, timestamp, before/after | **Pass** — activity + audit + field `reviewer_id` / `updated_at` / original vs normalized. Customer UI shows **Maya Chen** (acting user), not a truncated UUID |
| 8 | Incomplete products cannot be DPP-ready | **Pass** — Dock Trousers: missing composition; publish blocked |
| 9 | Eligible product can publish | **Pass** — Oxford v1 from UI |
| 10 | QR resolves stable public identity | **Pass** — same `itx_66236d2s2p0j386v0a5m` across v1/v2 |
| 11 | Machine-readable matches approved canonical | **Pass** — JSON public fields match approved name + composition |
| 12 | Later source update does not mutate published v1 | **Pass** |
| 13 | Reconciliation creates update/conflict state | **Pass** — passport `update_required` + locked-field conflict |
| 14 | v2 can publish; v1 remains immutable | **Pass** |
| 15 | Org A cannot access Org B | **Pass** — Atlas ⊄ `intertexe`; isolation live tests still pass |

### Issues created (Atlas)

| Type | Title | Severity | Product | Effect |
|---|---|---|---|---|
| missing_data | Composition missing | high | Dock Trousers `ATL-TRS-004` | Blocks publish |
| validation | Composition percentages do not total 100 | critical | Atlantic Knit Polo `ATL-KNT-005` (70% wool 20% cashmere → 90) | Blocks publish |
| missing_data | Manufacturing country / origin missing | high | Evening Silk Camisole `ATL-SLK-007` | Blocks publish |
| identifier | Ambiguous identifier collision | critical | Market Day Dress `ATL-DRS-008` vs `ATL-DRS-009` (`5601234567890`) | Blocks publish on the colliding row until Confirm same product / Treat as separate / Correct identifier |
| conflict | Locked composition differs from new source | high | Oxford, after v1 | Blocks v2 until Resolve + re-approve |

Also covered in the dataset and confirmed in normalized fields (no extra issue when parse succeeds): clean cotton oxford; 80/20 blend; shell/lining jacket; spandex→elastane jean.

### UX friction (updated)

Remaining friction only:

- Site cookie banner intercepts clicks until accepted.
- Mapping dropdowns list every canonical field under every column (noisy but accurate).
- Re-uploading the exact same mapped rows is idempotent (`already imported`); change a row or mapping to re-run.
- `016_org_member_directory.sql` is **applied** on obelisk-core (28 Aug 2026). Peer reviewer display names resolve via `org_member_directory` RPC.
- Local Next dev compile of dashboard routes can exceed a minute; that is dev-server latency, not the data plane.

## Operator UX pass (27 Aug 2026, later)

Simulated external-brand **backend/workflow gate remains passed**. This pass made the first-pilot operator path honest.

| Check | Result |
|---|---|
| 10 CSV rows → 10 active canonical products | **Pass** — `ATL-DRS-008` and `ATL-DRS-009` both exist |
| Shared GTIN not silently merged | **Pass** — preview counts “identifier collisions kept separate”; issue `Ambiguous identifier collision` on GTIN `5601234567890` with both SKUs named |
| Operator choices + audit | **Pass** — Confirm same product / Treat as separate / Correct identifier; resolution on issue + `audit_logs` + `activity_events`. Source rows stay immutable |
| Reviewer display | **Pass** for acting user — product detail shows **Maya Chen**, not a truncated UUID |
| Products / Issues / Passports usable | **Pass** — catalog search/filter/pagination, source vs canonical, provenance, blocking vs not, passport QR + versions |
| Brand nav | **Pass** — Overview, Products, Issues, Passports, Settings only. Founder still sees Later modules labeled unavailable |
| Journey copy | **Pass** — login → upload → map → preview → import → issues → review → passport answered inline |
| QR / v2 | **Pass** — `/p/itx_66236d2s2p0j386v0a5m` published version 2 |
| Isolation / no HQ | **Pass** — unchanged |

Evidence: `scripts/enterprise-pilot-ux.test.ts`, `scripts/atlas-atelier-pilot-gate.ts` (Maya user JWT, 10 products, collision detail, Issues/Product HTML), Playwright on `/dashboard/atlas-atelier` (nav, preview, both dresses, Maya Chen, public passport).

## Intelligence foundations live validation (28 Aug 2026)

`015_intelligence_foundations.sql` is **live** on obelisk-core. Focused live test `scripts/enterprise-intelligence.live.test.ts` passes (schema probe + end-to-end import, mapping template isolation, unknown-token learning loop, conflict candidate/cases, passport version snapshots, fail-closed benchmark and consumer loaders).

| Area | Classification | Safe for next pilot import? |
|---|---|---|
| Material ontology | Partial | Yes — v1 in process + DB; provenance columns persist |
| Normalization intelligence | Partial | Yes — `ontology_version`, `rule_id`, `intelligence_kind` written |
| Edge-case learning | Partial | Yes — org-scoped `observed`/`candidate`; RLS blocks global/approved promotion |
| Source mappings | Partial | Yes — fingerprint templates org-scoped; confirm still required |
| Benchmarks | Partial | Yes — fail-closed; no fabricated metrics |
| Regulatory intelligence | Placeholder | N/A — no evaluator |
| Consumer-demand intelligence | Placeholder | N/A — empty aggregates; fail-closed loader |

No intelligence asset is marked **Implemented**. See `docs/intelligence-architecture.md` for the full checklist.

**Migration note:** `016_org_member_directory.sql` is **applied** on obelisk-core (28 Aug 2026). Peer reviewer display names are available for multi-operator review.

## Identity and isolation (unchanged from Phase 1)

| Gate | Result | Evidence |
|---|---|---|
| Identity unit invariants | Pass | `scripts/enterprise-identity.test.ts` |
| Founder HQ login | Pass (harness) | `scripts/enterprise-customer-zero-gate.ts` |
| HQ → INTERTEXE DPP Workspace switch | Pass | Live identity + prior browser |
| Direct `/dashboard/intertexe` without Enterprise session | Pass | Middleware + layout |
| Service role off ordinary org data plane | Pass | Unit scan + brand UI used `enterprise_session` |
| Org A ⊄ Org B / supplier assigned-only / read-only | Pass | Re-run 27 Aug: isolation + permissions live tests green |
| Customer-zero HQ analyst browser journey | Pass | `/p/itx_4y244k254c1r1i1q7325` v2 (staff handoff, not this brand gate) |

## Outstanding Partial / Placeholder

From `lib/enterprise/page-states.ts`:

- **Implemented:** overview, products, issues, passports (first-pilot modules)
- Partial: benchmarking (aggregates only), integrations, settings
- Placeholder (hidden from brand nav; founder sees “Later”): suppliers, regulations, analytics, developers, files, activity

Intelligence / moat audit: `docs/intelligence-architecture.md`. **015 is live** on obelisk-core; live validation passed 28 Aug 2026. Ontology, normalization provenance, the reviewed edge-case loop, and saved source mappings are **Partial** and safe for the next pilot import. Benchmark, regulatory, and consumer-demand intelligence remain Partial/Placeholder by design until governed datasets and a rules evaluator exist. None marked Implemented.

## Recommendation

**READY FOR CONTROLLED FIRST PILOT** for a single brand operator on the Products → Issues → Passports path.

**Production (28 Aug 2026):** `https://www.intertexe.com` serves deployment `dpl_FKtXMv7NrzS3rjdjYFuZF1gimEaJ` from `main` @ **`4dc34ff`**. Enterprise env vars present on Vercel Production. Atlas pilot gate + browser acceptance pass on production. **Code freeze:** production changes limited to pilot-blocking bugs until first controlled brand completes onboarding.

**Founder onboarding (in branch, deploy pending):** `/dashboard/enterprise` gains invite link copy/regenerate/revoke and **Provision operator** (Enterprise Auth + profile + membership). Requires obelisk-core migration **`017_invitation_revocation.sql`**. After deploy + `017`, standard first-operator onboarding should not require DevTools or Supabase Auth admin.

All 14 pilot criteria are met in code and Atlas verification: Auth, tenant isolation, 10-row upload, understandable mapping/reconciliation, no silent GTIN collapse, visible provenance, resolvable issues, human-readable reviewer name (acting user), publish eligible / explain ineligible, QR + versions, unfinished modules hidden, no service-role dashboard data plane.

Do **not** treat this as general availability or invite an unguided third-party brand yet.

Before a second human in the same org, or before a real external brand:

1. Keep the operator on the five-item nav. Do not present Suppliers / Regulations / Analytics / Developers / Files / Activity as working product.
2. Do **not** move `/platform/demo` onto Demo Brand until that org has 10 **approved** products through this pipeline.

## Known limitations

- High-confidence mapping is auto-suggested; ambiguous columns (`MATERIAL_1`, Notes, Season) stay Ignore until the operator maps them. Commit still requires Confirm.
- Public resolver uses the service role only to read already-published versions. Org dashboard reads/writes stay on the user JWT.
- Next.js `redirect()` / `notFound()` often surface as HTTP 200; denials are content-based.
- Atlas Atelier and its published oxford passport were left in obelisk-core as synthetic_test evidence. Credentials are not in this repo.
