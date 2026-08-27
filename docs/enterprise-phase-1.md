# Phase 1 — first external customer path

Later modules (supplier portal, advanced benchmarking, consumer intelligence, billing automation, regulatory-news UI, API dashboards) may keep schema and Placeholder/Partial screens. They must not delay this path.

```text
login
  → organization resolution
  → catalog
  → upload
  → column mapping
  → import preview
  → immutable source preservation
  → reconciliation
  → normalization (deterministic first)
  → validation
  → issues
  → review / approval
  → DPP requirements evaluation
  → publishability check (server)
  → passport preview
  → publish
  → persistent identity
  → QR (URL only; not the record)
  → public resolver /p/[publicId]
  → machine-readable /p/[publicId]/json
  → analytics event
  → source update
  → reconciliation (no silent duplicate)
  → passport version update (historic published version unchanged)
```

Do not move `/platform/demo` onto Demo Brand until that org has 10 approved real products processed through this same pipeline.

## Current honesty

Products, issues, and passports now have real import / review / publish APIs and UI. They stay **Partial** until the live customer-zero journey and readiness gates above are recorded.

Later modules remain Placeholder except benchmarking, which may read approved aggregates and otherwise returns “Insufficient benchmark data.”


## Definition of done

- **Implemented** — schema + policy + server path + UI + test
- **Partial** — real backend, workflow incomplete
- **Placeholder** — navigation/UI only

A route is never “complete” by existing.
