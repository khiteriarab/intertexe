# DPP Registry integration

INTERTEXE integrates with the **EU Digital Product Passport Registry** through a provider abstraction. Registry registration identifiers are **separate** from INTERTEXE public resolver IDs (`itx_…`).

Official sources (European Commission / EUR-Lex only):

- [Digital Product Passport — European Commission](https://single-market-economy.ec.europa.eu/single-market/digital-product-passport_en)
- [Registry launch announcement (20 July 2026)](https://single-market-economy.ec.europa.eu/news/digital-product-passport-registry-now-live-2026-07-20_en)
- [ESPR Regulation (EU) 2024/1781](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1781)

## Registry environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| **Sandbox / testing** | `https://registry.acc.product-passport.ec.europa.eu` | Rehearsal; separate EU Login from production |
| **Production** | `https://registry.product-passport.ec.europa.eu` | Live registrations |

Per the Commission announcement (20 July 2026), registration is available through a **secure user interface** and an **application programming interface (API)**. INTERTEXE does **not** hard-code or fabricate registration. Until textile semantic catalogue and operator API credentials are confirmed for our use case, INTERTEXE uses the **manual adapter** (`ManualRegistryProvider`).

## Architecture

```
Passport publish → registration_ready payload → (manual UI or future API) → EU registration ID captured → attached to passport version
```

### Lifecycle states

`not_registered` → `registration_ready` → `submitted` → `registered`  
Failure paths: `failed`, `update_required`

Stored in `dpp_registry_registrations` with:

- environment, API/schema version
- product unique identifier, economic operator identifier, commodity code
- submission payload snapshot + hash
- submitter, timestamps, registry response
- EU unique registration identifier (verified separately)

### Code map

| Component | Path |
|-----------|------|
| Provider types | `lib/enterprise/registry/types.ts` |
| Manual adapter | `lib/enterprise/registry/manual-provider.ts` |
| Service (prepare / submit / attach) | `lib/enterprise/registry/service.ts` |
| API | `POST/GET …/products/{productId}/registry` |

### API actions (manual workflow)

1. **`prepare`** — build registration-ready JSON payload for the current published passport version.
2. **`record_submission`** — record that an operator submitted via Registry UI (who/when/response snapshot).
3. **`attach_registration`** — capture returned EU registration identifier after format validation.

**Important:** An EU registration identifier is **not** proof of legal compliance.

## INTERTEXE runbook — test environment

### 1. EU Login setup

- Use EU Login (Commission authentication) with MFA as required.
- Sandbox uses a **different EU Login context** from production (Commission testing environment guidance).

### 2. Organization enrolment

- Enrol your organisation as an economic operator in the **sandbox** Registry.
- Complete identity verification (Commission Implementing Regulation requirements).
- Store enrolment metadata in `economic_operators.registry_enrollment` (INTERTEXE).

### 3. Required economic-operator information

Prepare before enrolment:

- Legal name, registered address, country
- Company / legal identifier, VAT, EORI where applicable
- Operator role (manufacturer, importer, authorised representative, …)
- Qualified electronic seal/signature where required by Registry user guide

Assign the responsible operator per product via `product_economic_operators` when the brand is not the operator placing the product on the EU market.

### 4. Registering a test DPP

**As of August 2026 (Commission announcement):**

- Registry and sandbox are **operational**.
- First compliance deadline referenced by the Commission: **18 February 2027** (certain large batteries).
- Textile sector semantic catalogue may not yet support end-to-end registration rehearsal.

INTERTEXE steps:

1. Publish passport in INTERTEXE (Phase 1 publish path).
2. Call `POST …/registry` with `{ "action": "prepare", "environment": "sandbox" }`.
3. Download/review `submission_payload` — submit through Registry UI when textile/battery catalogue permits.
4. If submission fails due to undefined semantic catalogue, record the response and keep status `registration_ready` / `failed` with `error_state` — do not fabricate success.

### 5. Capturing the unique registration identifier

After successful Registry submission, copy the **EU unique registration identifier / URI** from the Registry response.

### 6. Associating with the INTERTEXE passport

```
POST …/registry
{
  "action": "attach_registration",
  "environment": "sandbox",
  "euRegistrationIdentifier": "<from Registry>",
  "registryResponse": { … }
}
```

### 7. Verifying Registry → INTERTEXE resolver path

Confirm:

- EU registration identifier stored on `dpp_registry_registrations`
- Public resolver still serves `https://www.intertexe.com/p/{itx_id}` with **public-class fields only**
- Readiness panel shows Registry domain items separately from Identity

### 8. Updates or withdrawals

- Publish a new passport version in INTERTEXE (immutable prior version retained).
- Set Registry row to `update_required` when product metadata changes require Registry update.
- Re-run prepare → submit → attach for the new `passport_version_id`.

## Automated integration status

| Item | Status |
|------|--------|
| Registry UI | Available (Commission) |
| Registry API | Announced; INTERTEXE adapter ready to swap when credentials + textile schema confirmed |
| INTERTEXE automated submission | **Unavailable** — use manual workflow |
| Browser scraping | **Prohibited** |

## Environment variable

`ENTERPRISE_REGISTRY_ENV` — `sandbox` (default) or `production`.
