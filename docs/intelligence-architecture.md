# INTERTEXE intelligence architecture

Audit date: 27 August 2026. Scope: obelisk-core (Enterprise) plus the consumer/HQ boundary. This document is the source of truth for what is a defensible intelligence asset versus customer configuration.

A table or empty UI is not Implemented. Implemented means governed records, deterministic use in a live path, provenance, and tests.

Do not merge consumer shop merchandising (`lib/catalog-material-taxonomy.ts`) into the DPP ontology.

INTERTEXE communicates readiness and evaluation. It does not claim governmental certification.

---

## Classification

| Asset | Audit (before this change) | After foundations in this change | Strict meaning |
|---|---|---|---|
| 1. Material ontology | **Missing** (ad-hoc maps in `lib/material-intelligence/composition.ts`) | **Partial** | v1 governed terms exist in code + `015` and are used by the parser. No ontology ops UI. v1 is frozen; breaking changes require `itx-ontology.v2`. |
| 2. Normalization intelligence | **Partial** | **Partial** (strengthened) | `normalized_fields` already stored original/normalized/method/confidence/reviewer. Now also ontology version, rule id, intelligence kind. Still no reusable global rule store in the live path beyond v1 ontology. |
| 3. Edge-case knowledge / learning loop | **Missing** | **Partial** | Reviewed conflicts and unknown tokens can write org-scoped `observed` / `candidate` rules + cases. Authenticated clients cannot insert `global` or `approved`. No review UI to promote rules. |
| 4. Benchmark intelligence | **Partial** | **Partial** | Fail-closed helper already refuses live tenant queries. Extra methodology/classification columns exist. No approved aggregate datasets. Founding-pilot UI remains gated. |
| 5. Regulatory intelligence | **Placeholder** | **Placeholder** | Tables exist (`008`). Regulations page is empty. Publish still records `phase1.identity-composition` plus ontology version on new snapshots. No ruleset evaluator over canonical fields. |
| 6. Integration / source-mapping intelligence | **Placeholder** | **Partial** | `import_mapping_templates` existed unused in `011`. Imports now save a fingerprint template and preview suggests it. Confirm is still required. Connector-neutral (`source_system` + schema fingerprint). |
| 7. Consumer-demand intelligence | **Missing** | **Placeholder** | Empty `consumer_intelligence_aggregates` table and fail-closed loader. No consumer events are piped. No speculative metrics. |

None of the seven assets is Implemented.

---

## 1. What exists today

### Product / source / canonical-field chain (real)

```text
organization → catalog → product → variant
  → source_records          immutable raw payload + hash
  → normalized_fields       original vs canonical + field state
  → issues / missing_data
  → passports → passport_versions (immutable once published)
```

This chain is the only place customer catalog facts live. HQ must not store them.

### Material ontology (was ad-hoc)

Until this change, composition used a hardcoded alias list (`spandex` → elastane, `flax` → linen, `merino` → wool). There was no canonical material ID, version, effective date, review state, multilingual aliases, parent/child, or provenance row. `PA` / `EA` / `PES` were not mapped. Nylon stayed `nylon` with no family link.

Consumer shop taxonomy is a separate merchandising graph for `/shop`. It is not a DPP ontology.

### Normalization

`normalized_fields` (migration `004`) already had:

- `original_value`, `normalized_value`
- `transformation_method`, `confidence`
- `state` (`observed` … `approved`)
- `source_record_id`, `reviewer_id`, timestamps, `locked`

The import pipeline wrote `transformation_method = deterministic` and `confidence = 1`. It did not record ontology version, rule id, or intelligence kind. Locked-field conflicts created issues; resolve applied the incoming value as unverified.

### Edge cases

`issues` stored original/interpreted values. Resolving an issue did not produce a reusable rule. The same pattern was re-solved per import.

### Benchmarks

`benchmark_datasets` / `benchmark_metrics` / `benchmark_permissions` exist. `loadGovernedBenchmark` reads only approved aggregates and returns **Insufficient benchmark data** when unpublished or undersampled. It does not query `products` or `source_records`. No approved datasets are in use. `founding_pilot` cannot open benchmarking (`canBenchmark: false`).

### Regulatory

`regulatory_frameworks`, `regulatory_rule_versions` (draft/reviewed/active/superseded), `regulatory_requirements`, `regulatory_evaluations` exist. AI cannot activate a ruleset by itself (status check). No seed rules. No evaluator. UI is a placeholder. Publish stored `ruleset_version: phase1.identity-composition` as a label, not a snapshot of required fields or jurisdiction.

### Import mappings

Each `imports` row stored `mapping` jsonb. Preview used global header heuristics. The operator rebuilt mapping every time. `import_mapping_templates` in `011` had `name`, `source_system`, `mapping` — unused.

### Consumer boundary

Two Supabase projects. Enterprise `analytics_events` are passport-scan scoped, tenant RLS. No one-way aggregate pipeline from consumer HQ. Identifiable consumer activity is not available to Enterprise organizations.

### Cross-cutting already present

- Immutable `source_records` and published `passport_versions`
- RLS tenant isolation
- `processing_jobs` / `ai_operations` columns for provider/model/prompt version (unused for ontology)
- Field states distinguish observed / normalized / approved
- Deterministic parse never invents a missing percentage

---

## 2. Gaps

| Gap | Why it matters |
|---|---|
| No versioned material ontology | Aliases lived in code; PA/EA/PES did not resolve; historical passports had nothing to pin to |
| Normalization rows lacked ontology/rule pointers | Cannot reproduce which knowledge produced a canonical value |
| No learning loop | Human review did not accumulate INTERTEXE knowledge |
| Mapping templates unused | Recurring PLM/CSV layouts were not organizational knowledge |
| Benchmarks have no derived datasets | Correct fail-closed behavior, but no moat |
| Regulatory tables unused | Hard-coded UI copy, not a rules engine |
| No permitted consumer aggregates | Correct isolation; also no demand intelligence |
| No explicit observed vs override kind on fields | Conflict accept looked like a normal update |
| Org vs global knowledge mixed in code | Risk of silently treating one customer’s slang as global truth |

---

## 3. Proposed canonical entities

INTERTEXE-owned (global, not tenant data):

| Entity | Purpose |
|---|---|
| `material_ontology_versions` | Version label, effective dates, review/approval, provenance |
| `material_terms` | Canonical id (`code`), name, family, parent, kind (fiber/material/construction/family), origin class (natural/regenerated/synthetic/other) |
| `material_aliases` | Alias/abbreviation, locale, provenance. Deterministic lookup. |
| `normalization_rules` (scope=`global`, status=`approved` only) | Reusable deterministic rules. Service-role write. |
| `regulatory_*` | Versioned rulesets mapped to canonical field keys (already designed in `008`) |
| `benchmark_datasets` / `benchmark_metrics` | Derived aggregates only; never identifiable customer rows |
| `consumer_intelligence_aggregates` | Privacy-classified cohort metrics; no consumer user id |

Customer-specific (tenant-isolated):

| Entity | Purpose |
|---|---|
| `source_records` | Observed fact (raw) |
| `normalized_fields` | Normalized fact + provenance + ontology version + rule id + intelligence kind |
| `issues` | Conflicts / validation / missing data |
| `normalization_rules` (scope=`organization`) | Org overrides and candidates. Must not mutate global ontology. |
| `normalization_rule_cases` | Original cases that justified a rule; always org-scoped |
| `import_mapping_templates` | Saved source-schema → canonical field mapping |
| `imports.mapping` | Per-file confirmation (audit of that run) |
| `passport_versions.snapshot` | Frozen published facts + ontology/ruleset labels |
| `regulatory_evaluations` | Per-product evaluation against a ruleset version |

Intelligence kinds on a field (observed fact vs interpretation):

| `intelligence_kind` | Meaning |
|---|---|
| `observed` | Copied from source with no semantic mapping |
| `normalized` | Deterministic ontology/rule applied |
| `derived` | Calculated (e.g. completeness). Not a source claim. |
| `override` | Human accepted a value that replaces a locked canonical |

AI-assisted interpretations, when they exist later, must store provider, model, prompt/template version, confidence, and review state on `ai_operations` / `processing_jobs`. They must never activate ontology, regulatory, or benchmark rows. Deterministic approved knowledge is always tried first.

---

## 4. How each layer attaches

```text
CSV / Excel / future PLM·PIM·ERP·API
  → import_mapping_templates   (org + source_system + schema fingerprint)
  → source_records             (observed payload, immutable)
  → material_aliases / terms   (deterministic token resolve, versioned)
  → org normalization_rules    (approved org aliases only; never silent global)
  → normalized_fields          (canonical product fields)
       ↳ issues + rule_cases   (learning loop, org-scoped)
       ↳ regulatory_evaluations (future; pin rule_version_id)
       ↳ passport_versions.snapshot (ontology_version + ruleset_version)
benchmark_datasets            (separate derived layer; not this chain)
consumer_intelligence_aggregates (one-way from consumer system; not this chain)
```

Canonical import fields today: `name`, `sku`, `gtin`, `style_code`, `variant`, `category`, `composition`, `manufacturing_country`. Ontology attaches primarily to `composition` tokens. Mapping templates attach to source column names, not to ontology terms.

Published passports keep the snapshot they were evaluated with. New ontology versions do not rewrite historical `passport_versions`.

---

## 5. Tenant / privacy boundaries

| Data | Isolation | Reuse |
|---|---|---|
| Raw source payloads, SKUs, GTINs, unpublished fields | Org RLS. Customer-confidential. | Never reused across tenants |
| Org mapping templates, org candidate rules, rule cases | Org RLS | Reused only inside that organization |
| Approved global ontology and global rules | Readable to authenticated; writable by service role | INTERTEXE-owned |
| Benchmark datasets | No `organization_id` on metric rows. Approved aggregates only. | Shared only if contractually permitted |
| Consumer aggregates | No consumer user/device id. No brand `organization_id` that could re-identify a person. Approved + privacy classification required. | Shared only as aggregates |
| Passport public fields | Public by access_class after publish | Not a training corpus |

RLS on `normalization_rules` insert: `scope = organization` and `status IN (observed, candidate, reviewed, rejected)`. User JWTs cannot mint global rules or mark them approved.

Consumer HQ and obelisk-core stay separate projects. Enterprise loaders must not query HQ consumer tables.

Minimum cohort thresholds:

- Benchmarks: `min_sample_size` on the dataset (default 5 until real methodology exists)
- Consumer aggregates: `min_cohort_size` default 50; undersize returns Insufficient benchmark data

---

## 6. INTERTEXE-owned reusable intelligence vs customer-specific configuration

INTERTEXE-owned (moat):

- Material ontology versions and aliases (PA → Polyamide, EA → Elastane, PES → Polyester, Nylon → polyamide family)
- Deterministic parse/normalization logic
- Globally approved rules promoted by INTERTEXE review (future)
- Governed benchmark methodology and permitted aggregates (future)
- Regulatory ruleset interpretations INTERTEXE has reviewed (future)
- Privacy-safe consumer aggregates INTERTEXE is allowed to publish (future)

Customer-specific (not moat, not global):

- Column mapping templates for that org’s PLM/CSV
- Org-scoped aliases (“our mill writes X”)
- Candidate rules and justifying cases (identifiable values stay in the org)
- Catalog, issues, passports, suppliers

Promotion path (manual, never automatic):

```text
org observed / candidate
  → org reviewed
  → INTERTEXE extracts a de-identified pattern
  → global rule vN approved
  → cases remain in the source org (not copied globally)
```

---

## 7. Versioning strategy

| Asset | Version unit | Compatibility rule |
|---|---|---|
| Ontology | `itx-ontology.v1`, `v2`, … | Do not mutate v1 terms used by published passports. Add aliases in a new version if the mapping would change published meaning. |
| Normalization rules | integer `version` per pattern + status `superseded` | New approval = new version. Old field rows keep `rule_id`. |
| Mapping templates | integer `version` + `last_used_at` | Same org + source_system + fingerprint updates in place; mapping change increments version. |
| Regulatory | `regulatory_rule_versions.version_label` | Evaluations and passport snapshots point at a specific version. New ruleset ⇒ new evaluation, old rows untouched. |
| Benchmarks | `methodology_version` + `calculated_at` | Recalculation writes a new dataset or retires the old one. |
| Consumer metrics | `metric_version` + methodology | Same. |
| Passports | `passport_versions.version_number` | Published rows immutable. Snapshot includes `ontology_version` and `ruleset_version`. |

Reproducibility: given `source_record_id` + ontology version + rule id + mapping template fingerprint, a later engine should be able to explain the canonical field.

---

## 8. Recommended implementation order

Do not delay first-pilot readiness by finishing the whole platform.

1. **Ontology v1 used by the parser** (this change)
2. **Normalization provenance** (ontology version, rule id, intelligence kind) (this change)
3. **Edge-case loop as org-scoped observed/candidate + cases** (this change)
4. **Saved source mappings with fingerprint reuse** (this change)
5. INTERTEXE review UI to promote de-identified candidates to global approved rules
6. Org-approved alias application already reads `status=approved` (no JWT path to approve — service role / future ops)
7. Regulatory evaluator over canonical fields + snapshot of required-field list (keep Placeholder until then)
8. Seed governed benchmark datasets from permitted, contracted aggregates only
9. Consumer event inventory on HQ; only then a batch aggregate job into `consumer_intelligence_aggregates`

Future metrics (natural-fiber share, synthetic share, composition completeness, evidence completeness, material mix, DPP readiness) belong on the benchmark layer, not as live cross-tenant queries.

---

## Foundations implemented now (minimum for customer-zero / pilot imports)

Migration `enterprise/supabase/migrations/015_intelligence_foundations.sql` plus:

- `lib/enterprise/ontology.ts` — frozen `itx-ontology.v1`, used by `parseCompositionText`
- Pipeline writes `ontology_version`, `rule_id`, `intelligence_kind`; records unknown tokens as org `observed` rules
- Preview loads the last approved mapping template for the same source schema fingerprint
- Commit upserts that template (`source_system` defaults to `upload`)
- Review/approve may write org `candidate` rules and cases; never global, never auto-approved
- New passport versions snapshot `ontology_version` and `ruleset_version` (existing published rows are not rewritten)
- Empty consumer aggregate table; fail-closed loader; no fake metrics

If `015` is not yet applied to obelisk-core, imports still succeed: extra columns and new tables fail closed and retry on the previous schema. Ontology v1 still runs in process.

**Live status (28 Aug 2026):** `015_intelligence_foundations.sql` is **applied** on obelisk-core (`dpiksashuqetyzrjogal`). Service-role schema probe and `scripts/enterprise-intelligence.live.test.ts` (with `ENTERPRISE_ALLOW_LIVE_TESTS=true`) both pass.

### Live validation (28 Aug 2026)

| Check | Result |
|---|---|
| Ontology v1 row (`material_ontology_versions`, `status=approved`) | **Pass** |
| PA → Polyamide, EA → Elastane, PES → Polyester (parser) | **Pass** |
| Nylon → polyamide family (`fiber_code=nylon`, governed term) | **Pass** |
| `normalized_fields.ontology_version` on import | **Pass** |
| `normalized_fields.rule_id` / `intelligence_kind` (`observed`, `normalized`, `override`) | **Pass** |
| Unknown token → org-scoped `observed` rule (not global/approved) | **Pass** |
| Conflict resolve → org `candidate` rule + `normalization_rule_cases` + `override` field | **Pass** |
| Authenticated user cannot insert `scope=global` or `status=approved` rules | **Pass** (RLS) |
| Saved mapping only for same org + `source_system` + schema fingerprint | **Pass** |
| Saved mapping still requires operator confirm (empty mapping does not wipe template) | **Pass** |
| Passport v1 snapshots `ontology_version` + `ruleset_version` | **Pass** |
| Published v1 immutable after ontology column update attempt | **Pass** |
| `loadGovernedBenchmark` fail-closed (`Insufficient benchmark data`) | **Pass** |
| `loadConsumerIntelligenceAggregate` fail-closed (no fabricated metrics) | **Pass** |

Classification remains honest: **Partial** for ontology, normalization, edge-case learning, benchmarks, and source mappings; **Placeholder** for regulatory and consumer-demand intelligence. **None** marked Implemented.

`016_org_member_directory.sql` is **applied** on obelisk-core (28 Aug 2026). Peer reviewer display names are available via `org_member_directory` RPC.
