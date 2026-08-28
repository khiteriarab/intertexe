# Evidence and supplier workflow

Minimum supplier evidence workflow so brands can resolve missing DPP evidence without adopting a full supplier-network platform.

## Principles

- Evidence is **not** automatically verified when uploaded.
- Supplier access is **assigned-only** — suppliers never see the full brand catalog.
- Supplier responses enter **review** and do **not** modify approved canonical fields automatically.
- Flow: **issue → supplier request → supplier submission → evidence review → approved evidence → canonical review → readiness recalculation**

## Data model

| Table | Role |
|-------|------|
| `issues` | Source gap (e.g. missing country-of-origin evidence) |
| `suppliers` | Supplier directory per organisation |
| `supplier_requests` | Scoped request (`issue_id`, `product_id`, `requested_evidence`, deadline) |
| `supplier_submissions` | Supplier payload (`review_status`: pending / approved / …) |
| `evidence_records` | Verification lifecycle per field |

### Evidence verification states

`missing` → `requested` → `received` → `under_review` → `verified`  
Terminal: `rejected`, `expired`

Each evidence record supports:

- evidence type, issuing organisation, source supplier
- document reference (file integration partial)
- issue/expiry dates, reviewer, `verified_at`
- field / product linkage
- `access_class` (confidentiality)

## Brand operator flow

1. Open product → **Issues**.
2. On an open **missing_data** issue, click **Request from supplier**.
3. Enter supplier name, optional email, deadline, notes.
4. System creates:
   - `supplier_requests` row (scoped to product + issue)
   - `evidence_records` row with `verification_status: requested`

API: `POST /api/dashboard/org/{slug}/issues/{issueId}/supplier-request`

```json
{
  "supplierName": "Mill Co.",
  "supplierEmail": "dpp@mill.example",
  "dueAt": "2026-09-30",
  "notes": "Need origin certificate for cotton lot"
}
```

## Supplier flow (foundation)

Suppliers with `supplier_contributor` role and assignment may:

- View assigned `supplier_requests` only (RLS)
- Submit via `supplier_submissions` (creates `under_review` evidence)

Review approval (`approveSupplierEvidence`) marks evidence **verified** and closes the request. Canonical `normalized_fields` are updated only through existing **review/approve** paths — not directly from supplier payload.

## Code map

| Component | Path |
|-----------|------|
| Request creation | `lib/enterprise/supplier-evidence.ts` → `createSupplierEvidenceRequest` |
| Submission + review | `submitSupplierEvidence`, `approveSupplierEvidence` |
| Evidence helpers | `lib/enterprise/evidence.ts` |
| Product UI | `SupplierEvidenceRequestButton.tsx` |
| Readiness integration | `lib/enterprise/dpp-readiness.ts` (Evidence domain) |

## What is not built

- Supplier marketing / discovery network
- Multi-tier supply-chain graph
- Automatic canonical merge from supplier PDFs
- Full supplier dashboard module (Suppliers nav remains later-stage)

## Readiness interaction

The **DPP readiness** panel Evidence domain lists per-field status with drill-down. Missing evidence surfaces as **Needs attention** with the issue or evidence detail — never as an opaque percentage score.
