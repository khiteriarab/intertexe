# EU DPP compliance roadmap

Audit date: **28 August 2026**  
Production branch target: `main` (obelisk-core / `www.intertexe.com`)

INTERTEXE ownership layer:

**ingestion → normalization → evidence/gap management → regulatory readiness → DPP generation → persistent identity/data carrier → Registry integration → lifecycle/versioning**

This document tracks first-pilot capability against EU DPP foundations. It does **not** claim EU certification or full textile-DPP compliance.

## Status legend

| Status | Meaning |
|--------|---------|
| **Implemented** | Production-ready foundation in code + schema |
| **Partial** | Working subset; gaps remain |
| **Missing** | Not built |
| **Awaiting textile delegated act** | Blocked on sector-specific EU law / semantic catalogue |

---

## 1. EU DPP Registry integration layer

| Capability | Status | Notes |
|------------|--------|-------|
| Provider abstraction (sandbox / production) | **Implemented** | `lib/enterprise/registry/*` |
| Registration lifecycle states | **Implemented** | `dpp_registry_registrations` |
| Registration-ready payload generation | **Implemented** | No fabricated API calls |
| Manual submission workflow | **Implemented** | prepare → record submission → attach EU ID |
| Automated Registry API integration | **Partial** | EC announces UI + API; INTERTEXE uses manual adapter until credentials/schema confirmed for textiles |
| Textile DPP registration in Registry | **Awaiting textile delegated act** | Battery catalogue available first; textile semantic catalogue pending |

## 2. Standards-conformant identity and data carriers

| Capability | Status | Notes |
|------------|--------|-------|
| Separate identifier concepts in model | **Implemented** | `lib/enterprise/identifiers.ts`, snapshot `identifier_bundle` |
| Persistent `itx_` resolver ID | **Implemented** | Separate from EU registration ID |
| QR binds to resolver URL only | **Implemented** | No full payload in QR |
| QR / NFC / RFID carrier table | **Partial** | Schema supports carriers; QR is primary UI path |
| Legally conformant unique product identifier | **Awaiting textile delegated act** | External issuing-system slot exists |
| Full Article 10 textile data-carrier encoding | **Awaiting textile delegated act** | |

## 3. Access-right architecture

| Capability | Status | Notes |
|------------|--------|-------|
| Extended access_class enum | **Implemented** | Migration 018 |
| Server-side public filtering | **Implemented** | `/p/{id}` and `/p/{id}/json` |
| Actor-specific authenticated views | **Partial** | Model ready; dedicated actor portals not built |
| Textile-specific access matrix | **Awaiting textile delegated act** | |

## 4. Regulatory requirements engine

| Capability | Status | Notes |
|------------|--------|-------|
| Versioned requirements schema | **Implemented** | `008` + 018 extensions |
| ESPR foundation evaluator | **Implemented** | `espr-foundation.v1` |
| Product evaluation statuses | **Implemented** | satisfied / missing / awaiting_rule / … |
| Textile obligations | **Awaiting textile delegated act** | Never invented |
| “DPP Ready” label | **Implemented** | Named ruleset only — **ESPR foundation readiness** |

## 5. Evidence management

| Capability | Status | Notes |
|------------|--------|-------|
| Evidence records + verification states | **Implemented** | `evidence_records` |
| Confidentiality / access on evidence | **Implemented** | `access_class` on evidence |
| Auto-verify uploads | **Missing (by design)** | PDFs/statements enter review |
| Document file storage integration | **Partial** | `document_reference` only |

## 6. Supplier evidence request workflow

| Capability | Status | Notes |
|------------|--------|-------|
| Issue → supplier request | **Implemented** | API + product UI |
| Assigned-only supplier scope | **Implemented** | RLS on `supplier_requests` |
| Supplier submission → review | **Implemented** | Does not auto-modify canonical data |
| Supplier portal UI | **Partial** | API/data model; no full supplier product |

## 7. DPP service-provider / backup architecture

| Capability | Status | Notes |
|------------|--------|-------|
| Export snapshot + hashable package | **Implemented** | `passport_backup_packages` |
| Provider abstraction | **Implemented** | `lib/enterprise/backup-provider.ts` |
| Certified DPP service provider | **Missing (by design)** | Not claimed |
| Third-party replication | **Partial** | `backup_provider_ref` + status enum |

## 8. Passport availability and integrity

| Capability | Status | Notes |
|------------|--------|-------|
| Persistent resolver IDs | **Implemented** | |
| Immutable published versions | **Implemented** | DB trigger |
| Integrity hashes | **Implemented** | `integrity_hash` on publish |
| Version chain / supersession | **Implemented** | `previous_version_id` |
| Retention metadata | **Implemented** | JSON on version |
| Hard delete of published versions | **Blocked** | Trigger prevents |

## 9. Economic operator data

| Capability | Status | Notes |
|------------|--------|-------|
| Economic operator profile | **Implemented** | `economic_operators` |
| Product-level operator assignment | **Implemented** | `product_economic_operators` |
| Settings UI | **Partial** | Schema + lib; minimal dashboard UI |
| Registry enrolment capture | **Partial** | JSON metadata field |

## 10. DPP readiness screen

| Capability | Status | Notes |
|------------|--------|-------|
| Multi-domain auditable readiness | **Implemented** | Product page panel |
| Drill-down to field/rule/evidence | **Implemented** | Per-domain items |
| Opaque compliance score | **Missing (by design)** | |

## 11. EU Registry test-environment workflow

| Capability | Status | Notes |
|------------|--------|-------|
| Official runbook | **Implemented** | `docs/dpp-registry-integration.md` |
| Automated textile registration rehearsal | **Awaiting textile delegated act** | Enrolment rehearseable now |

---

## Explicitly not in scope (frozen)

- Benchmark datasets
- Consumer-demand metrics
- Ontology admin UI
- Broad PLM/ERP connector catalogue
- LCA engine
- Full multi-tier supply-chain traceability

---

## Competitive gap (material, not exhaustive)

Fairly Made, Retraced, TrusTrace, and Kezzler remain ahead on:

- Mature supplier network portals and tier-N traceability
- LCA / environmental impact calculation
- Deep PLM/ERP connector catalogues
- Large benchmark / industry comparison datasets
- Operational textile Registry registration at scale (sector-wide — industry-wide gap until delegated act + catalogue)

INTERTEXE differentiator path: governed ownership layer from import → evidence → readiness → passport → Registry, without replacing external traceability systems.
