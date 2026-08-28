# Enterprise canonical entity model

obelisk-core is the only source of truth for customer product data.

Founder HQ (consumer Supabase) may store **references only**:

- `enterprise_organization_id`
- `enterprise_organization_slug`
- `enterprise_pilot_status`
- `enterprise_implementation_status`
- existing `hq_deals.id` / contact IDs

HQ must not store catalogs, source records, normalized fields, issues, passports, supplier records, or customer files.

## Critical chain

```text
organization
  → catalog
    → style / model  (products)
      → variant
        → identifiers          (SKU, GTIN, style, source-system IDs — distinct from UUIDs)
        → source_records       (immutable raw payload + hash)
          → normalized_fields  (canonical values + provenance)
            → issues
            → passport
              → passport_versions   (published versions are immutable)
              → persistent_identities
                → data_carriers     (QR / NFC / RFID → resolver URL, not the record)
```

Internal product UUID, SKU, style ID, GTIN, variant ID, passport ID, and public resolver ID remain distinct.

## Attachments

| Concern | Attaches to | Notes |
|---|---|---|
| Provenance | `normalized_fields` via `source_record_id`, original/normalized values, transformation method, confidence, timestamps | Never invent missing data |
| Evidence | `normalized_fields.evidence_id`, `files` (org-folder storage) | Private buckets; public passport assets are separate |
| Review state | `normalized_fields.state`, `reviewer_id`, `locked` | Locked approved values are not overwritten by reprocessing |
| Issues | `issues.product_id` / `variant_id` | Conflicts and identifier collisions create issues rather than silent merges |
| Regulatory evaluations | `regulatory_evaluations` → product / passport + `rule_version_id` | New ruleset ⇒ new evaluation; old rows are not rewritten |
| Activity vs audit | `activity_events` (operational) and `audit_logs` (security) | Separate tables |

## Identifiers and carriers

```text
Product / variant
  → persistent_identities.public_id   (stable, non-sequential, e.g. itx_…)
  → data_carriers                     (QR artwork may change; identity must not)
  → GET /p/[publicId]                 (consumer HTML)
  → GET /p/[publicId]/json            (machine-readable public fields only)
```

If a brand later supplies a GTIN / GS1 Digital Link, it is stored on `product_identifiers` without destroying history.

## Data classification

Every organization has:

- `environment`: `local` | `staging` | `production`
- `is_demo`
- `is_customer_zero`
- `approved_for_public_demo` (requires `is_demo`)
- `data_classification`: `public_demo` | `customer_confidential` | `internal` | `synthetic_test`

`/platform/demo` may only read Demo Brand rows that are `is_demo` and `approved_for_public_demo`. It must not accept an organization slug query parameter.

## Benchmarking (not on this chain)

Peer benchmarking never queries identifiable customer tables. It reads `benchmark_datasets` that are **approved aggregates** with provenance, sample size, market/category/period, and permissions. Insufficient sample size returns “Insufficient benchmark data.”

Intelligence assets (ontology, normalization rules, mapping templates, consumer aggregates) are specified in `docs/intelligence-architecture.md`. Shop merchandising taxonomy is not the DPP ontology.
