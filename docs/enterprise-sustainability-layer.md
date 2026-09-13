# Environmental Impact & Sustainability Verification

INTERTEXE stores evidence once, then renders it for regulatory regimes, brand interfaces, consumer passports, and dashboards.

## Three scores (never one vague green number)

| Score | What it measures |
|-------|------------------|
| **Regulatory environmental score** | Official methodology (e.g. France Ecobalyse impact points) |
| **INTERTEXE traceability score** | How much of the supply chain can be **proven** |
| **Consumer sustainability profile** | Separate dimensions (materials, carbon, durability, circularity) |

## Lifecycle model

```
Manufacturing → Traceability → Passport → Environmental impact → Ownership → Resale → Next owner
```

QR / NFC / RFID resolve to the **live passport record** — tags identify the product; data evolves after manufacture.

## API surfaces

| Endpoint | Audience |
|----------|----------|
| `GET /p/{publicId}/json` | Full structured `passport` object |
| `GET /api/dashboard/org/{org}/passports/{publicId}` | Brand white-label Product API |
| `GET /api/dashboard/org/{org}/sustainability` | Brand catalog aggregates |

## Passport structure

```
product · materials · supplyChain · manufacturing · traceability · certifications
environmentalImpact · regulatoryScores · circularity · resale · lifecycle · sustainabilityProfile
```

## Schema

- `product_impact_inputs` — carbon, water, biodiversity, resource use (024)
- `product_regulatory_scores` — jurisdiction-specific scores e.g. FR Ecobalyse (030)
- `supply_chain_nodes` — tier 1–4 trace evidence (024)

## Architecture rule

Regulatory scoring is **modular**. France uses Ecobalyse today; other jurisdictions add rows to `product_regulatory_scores` without rebuilding brand data infrastructure.
