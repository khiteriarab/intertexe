# Platform imagery map

**Principle:** Marketing pages show **designed workspace screenshots** (dark editorial UI panels like Material Benchmark), not HTML/CSS charts. QR/NFC resolves to live product — platform pages show **what the SaaS looks like**.

**Phase 1 (now):** Assign the correct image to each page/section.  
**Phase 2 (next):** Replace CSS chart components with `<img>` assets.  
**Phase 3 (later):** Scroll-triggered box reveals on isolated regions of each image.

Reference style: Material Benchmark panel — dark `#161513` background, serif numerals, peer comparison bars, cohort list, readiness stat, material mix footer. Boxes must be visually distinct for scroll isolation.

---

## `/platform` — Overview

| Section | Current visual | Target asset | Status |
|---------|----------------|--------------|--------|
| **Hero** | `hero-workspace-desktop.png` + dial animation | `hero-workspace-desktop.png` | ✅ Have — keep |
| **What INTERTEXE is** | Text pillars only | Optional: none (typography-led) | OK as-is |
| **Scroll showcase — Trace** | `INTERTEXE_02_Product_Data_Journey.png` | Same | ✅ Have |
| **Scroll showcase — Measure** | `ecosystem-intelligence.jpg` (generic photo) | **`compare-benchmark.png`** | ❌ Need — use Material Benchmark style |
| **Scroll showcase — Govern** | `hero-workspace-desktop.png` | **`workspace-govern.png`** (issues + approved record crop) | ⚠️ Partial — desktop hero works; prefer dedicated crop |
| **Scroll showcase — Publish** | `INTERTEXE_03_Fashion_Ecosystem.png` | **`act-passport.png`** or keep ecosystem diagram | ⚠️ Have diagram; passport studio preferred |
| **Scroll showcase — Next life** | Product photo (case study) | **`resale-routes.png`** + product photo | ❌ Need resale/orchestration panel |
| **Governed record** | `hero-workspace-desktop.png` | **`workspace-catalog.png`** (catalog → materials sidebar view) | ⚠️ Reuse hero or new crop |
| **Intelligence** | `IntelligenceBenchmarkVisual` (CSS charts) | **`compare-benchmark.png`** | ❌ Need — **your screenshot is the reference** |
| **Delivery modes** | `DeliveryModesVisual` (text cards) | **`delivery-modes.png`** (Hosted / White-label / Headless visual) | ❌ Need |
| **Platform breadth** | `PlatformModuleGrid` (text module list) | **`workspace-modules.png`** (sidebar + module overview) | ❌ Need |
| **Start for free** | Text CTA panel | None | OK as-is |

---

## `/platform/discover` — Workspace gallery

| Frame | Current | Target asset | Status |
|-------|---------|--------------|--------|
| Overview | `WorkspaceHeroPreview` (CSS metrics + fiber bar + peers) | **`hero-workspace.png`** | ❌ Need (slot in `lib/platform-graphics.ts`) |
| Material intelligence | `NormalizePreview` or graphic slot | **`understand-normalize.png`** | ❌ Need |
| Issues | `IssuesPreview` (CSS inbox) | **`understand-issues.png`** | ❌ Need |
| Material Benchmark | `BenchmarkPreview` (CSS — same as homepage chart) | **`compare-benchmark.png`** | ❌ Need |
| Passport studio | `PassportPreview` | **`act-passport.png`** | ❌ Need |
| Regulatory monitor | `RegulatoryPreview` | **`regulatory-monitor.png`** | ❌ Need |
| Product journey (scroll) | `ProductDataJourneyVisual` (CSS) | `INTERTEXE_02_Product_Data_Journey.png` | ✅ Have |

---

## `/platform/demo` — Live proof

| Section | Current | Target asset | Status |
|---------|---------|--------------|--------|
| Live scan flow | `SaaSDemoFlowVisual` (composite: workspace img + QR + phone) | Keep composite OR **`demo-passport-flow.png`** single designed frame | ⚠️ Partial — works today |
| Catalog walkthrough — Source | `CatalogPreview` / CSS table | **`demo-source.png`** | ❌ Need |
| Catalog walkthrough — Normalized | CSS preview | **`demo-normalized.png`** | ❌ Need |
| Catalog walkthrough — Issues | `IssuesPreview` | **`understand-issues.png`** (reuse) | ❌ Need |
| Catalog walkthrough — Intelligence | CSS overview | **`demo-intelligence.png`** | ❌ Need |
| Catalog walkthrough — Benchmark | `BenchmarkPreview` | **`compare-benchmark.png`** (reuse) | ❌ Need |
| Catalog walkthrough — Passports | `PassportPreview` | **`act-passport.png`** (reuse) | ❌ Need |
| API playground — Result tab | **CSS fiber bar chart** | Remove bar — show JSON screenshot OR **`api-response-panel.png`** | ❌ Need optional |
| API playground — JSON tab | Live JSON | Keep interactive (not a chart) | OK |
| Barcelona office | `barcelona-platform-office.jpg` | Same | ✅ Have |

---

## `/platform/api` — API docs

| Section | Current | Target asset | Status |
|---------|---------|--------------|--------|
| Overview | Text + code blocks | **`api-architecture.png`** (Product Passport API → brand app diagram) | ❌ Need |
| Passport structure | Text | **`passport-api-schema.png`** (product / traceability / environmentalImpact / circularity tree) | ❌ Need — aligns with new sustainability layer |
| Quickstart / examples | Code blocks only | Keep code — no charts | OK |

---

## `/platform/request` — Lead capture

| Section | Current | Target asset |
|---------|---------|--------------|
| Form | Text + form | Optional: **`onboarding-preview.png`** (workspace first-login) | ❌ Nice-to-have |

---

## New imagery needed (priority order)

### P0 — Unblocks homepage + discover + demo (same asset reused)

**1. `compare-benchmark.png`** (Material Benchmark)  
- **Reference:** Screenshot shared 2026-09-13 (dark panel)  
- **Boxes to isolate later:** header stats · peer comparison · conversion cohorts · catalog readiness · material mix  
- **Dimensions:** ~2400×1500, PNG  
- **Copy baked in:** Customer Zero · 10 products · peer medians · illustrative only footer  

**2. `act-passport.png`** (Passport Studio)  
- Publish screen + QR identity + phone passport preview (Trace or Essential template)  
- **Boxes:** workspace publish · QR card · consumer passport  

**3. `understand-issues.png`** (Issues inbox)  
- Sidebar + issues list with Dress 8721 conflict highlighted  
- **Boxes:** filter chips · issue rows · detail panel  

### P1 — Completes the story (four engines)

**4. `hero-workspace.png`** (Catalog overview)  
- Full dashboard: metrics, material mix strip, peer snippet, issues count — **no marketing headline burned in**  

**5. `understand-normalize.png`** (Normalization split)  
- Left: messy source · Right: INTERTEXE normalized record with original retained  

**6. `delivery-modes.png`** (Hosted / White-label / Headless)  
- Three columns with example URLs — visual not prose  

**7. `resale-routes.png`** (Next life / Circularity)  
- Resale Value + Best Resale Route comparison (matches new resale session UX)  
- **Boxes:** value card · route options · ownership transfer note  

**8. `sustainability-passport.png`** (Environmental intelligence)  
- Consumer passport: French environmental cost + traceability score + dimension table  
- Supports new sustainability layer positioning  

### P2 — Demo walkthrough + API

**9–11.** `demo-source.png`, `demo-normalized.png`, `demo-intelligence.png`  
**12.** `regulatory-monitor.png`  
**13.** `passport-api-schema.png`  
**14.** `workspace-modules.png`  

---

## CSS components to retire (replace with images)

| Component | File | Replace with |
|-----------|------|--------------|
| `IntelligenceBenchmarkVisual` | `sales-visuals.tsx` | `compare-benchmark.png` |
| `BenchmarkPreview` | `workspace-previews.tsx` | `compare-benchmark.png` |
| `WorkspaceHeroPreview` inner charts | `workspace-previews.tsx` | `hero-workspace.png` |
| Fiber bar in demo API result | `PlatformDemoClient.tsx` | Remove or `api-response-panel.png` |
| `GovernedRecordVisual` | `sales-visuals.tsx` | `understand-normalize.png` or dedicated `governed-record.png` |
| `PlatformModuleGrid` | `sales-visuals.tsx` | `workspace-modules.png` (optional keep text fallback) |
| `DeliveryModesVisual` | `b2b-visuals/DeliveryModesVisual.tsx` | `delivery-modes.png` |

**Keep interactive (not charts):** API playground JSON, live QR links, demo GTIN lookup form, scroll dial overlay on photos.

---

## File naming convention

```
public/platform/
  compare-benchmark.png      ← P0 Material Benchmark (dark)
  hero-workspace.png         ← catalog overview
  understand-normalize.png
  understand-issues.png
  act-passport.png
  delivery-modes.png
  resale-routes.png
  sustainability-passport.png
  demo-source.png
  demo-normalized.png
  demo-intelligence.png
  regulatory-monitor.png
  passport-api-schema.png
```

Drop files → set `ready: true` in `lib/platform-graphics.ts` → components swap from CSS to `<img>`.

---

## Scroll animation regions (Phase 3 prep)

When creating images, keep **clear gutters** between these regions (min ~24px or visible border):

**Material Benchmark (`compare-benchmark.png`):**
1. Top bar — title + 3 stat pills  
2. Left panel — peer comparison bars  
3. Top-right — conversion cohorts  
4. Bottom-right — catalog readiness 62%  
5. Footer — material mix bar + legend  

**Resale routes (`resale-routes.png`):**
1. Estimated value  
2. Route comparison cards  
3. Verified listing draft snippet  

Document region coordinates in a companion `*.regions.json` when images are final.
