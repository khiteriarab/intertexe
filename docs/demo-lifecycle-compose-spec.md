# See It Live — Lifecycle Map + Software Bridge Spec

**Status:** Design approval required before production wiring  
**Isolation path:** `/platform/demo/lifecycle-wireframe`  
**Production stays on:** current `ProductLifecycleSection` + `DemoProductWorkflow` until approved  
**Library:** Motion for React via existing `framer-motion@^12` (already installed)

---

## 1. Story intent

| Beat | Visitor should feel |
|---|---|
| Map | “I understand the entire INTERTEXE product lifecycle in a few seconds.” |
| Bridge | “That same product record is entering the real software.” |
| Walkthrough | “Now I see what the lifecycle looks like inside INTERTEXE.” |

One persistent product record (Silk Midi Skirt · ITX-4102) is the narrative object across map → transition → six software stages.

---

## 2. Tokens (existing INTERTEXE SaaS)

| Role | Value |
|---|---|
| Page / map bg | `#faf7f2` (ivory) continuous through bridge |
| Ink | `#111111` / charcoal |
| Muted | `#3d3a36` / quiet `#5a564f` |
| Route base | `#d4cdc2` · 1.25px |
| Route active | `#c4a574` · 1.75px · no glow |
| Gold accent | `#c9a962` |
| Serif | `var(--itx-serif)` via `SERIF` |
| Sans | `var(--itx-sans)` |
| Border radius | 0–6px on frames only; stage labels uncarded |

---

## 3. Lifecycle map canvas

| Property | Spec |
|---|---|
| Content width | `max-width: 1360px` |
| Map SVG viewBox | `0 0 1320 660` |
| Rendered map height | ~620–680px desktop |
| Intro above map | eyebrow · headline · lede · optional CTA row |
| Detail region | fixed panel under map (`min-height: 9.5rem`) |

### 3.1 Stage anchors (viewBox coordinates)

Art-directed clockwise open-loop (asymmetric horseshoe). Center kept open for the record.

| # | Stage | Anchor (x, y) | Label offset |
|---|---|---|---|
| 01 | Source & Make | **160, 128** | above-left (−8, −56) |
| 02 | Clean & Connect | **470, 92** | above (−50%, −62) |
| 03 | Trace & Prove | **980, 138** | above-right (+12, −56) |
| 04 | Check & Prepare | **1140, 310** | right (+28, −50%) |
| 05 | Passport & Publish | **980, 530** | below-right (+8, +28) |
| 06 | Use & Learn | **520, 568** | below (−50%, +28) |
| 07 | Repair & Recirculate | **190, 470** | below-left (−12, +24) |

### 3.2 Central product record

| Property | Spec |
|---|---|
| Position | center **(660, 300)** |
| Size | **248 × 292** px (within 220–280 width) |
| Product | Silk Midi Skirt · ITX-4102 |
| Contents | silhouette/thumbnail · title · SKU · composition line · supplier/data tick · small TX mark |
| Behavior | same object accumulates stage signals; never fully redrawn |

### 3.3 SVG route

Cubic spline through anchors 01→07, then a short “continuation stub” exiting downward from near 07/06 toward the bridge (`M … L 660 640` then into DOM continuation).

```
M 160 128
C 280 90, 380 90, 470 92
C 620 95, 860 100, 980 138
C 1080 170, 1160 230, 1140 310
C 1120 400, 1080 480, 980 530
C 820 580, 640 585, 520 568
C 360 545, 250 510, 190 470
```

Base path always visible (taupe). Active progress via `pathLength` / Motion `pathLength` from 0→1 across stages (`progressForStage(i) = i / 6`).

### 3.4 Stage label copy (map surface — short only)

| # | Title | Short descriptor (≤6 words) |
|---|---|---|
| 01 | Source & Make | Materials · suppliers · make |
| 02 | Clean & Connect | One trusted record |
| 03 | Trace & Prove | Claims linked to evidence |
| 04 | Check & Prepare | Ready for DPP |
| 05 | Passport & Publish | Governed identity published |
| 06 | Use & Learn | Intelligence from use |
| 07 | Repair & Recirculate | Beyond first sale |

Typography: number 11–12px tracked muted tan; title serif 18–22px charcoal; descriptor sans 12–13px muted. **No boxes/cards.**

### 3.5 Detail region (single fixed slot)

Centered under map. Crossfade on stage change:

- number + title (serif)
- full one-sentence description (from brief)
- four industry terms as editorial metadata (· separators / thin underlines on links)

Copy + terms: preserve from current `lifecycle-data.ts` (minor Check & Prepare wording aligned to brief: “prepare products for…”).

### 3.6 Micro-visual signals (abstract, not icons)

Drawn as SVG accents around the record; only the **active** stage’s signals at full opacity (others at 0–0.15).

| Stage | Signal |
|---|---|
| 01 | 3 thin source strands → record (Material / Supplier / Manufacturing) |
| 02 | fragmented horizontal strokes aligning into structured rows |
| 03 | 2–3 evidence nodes + thin links to record |
| 04 | small status ticks incomplete → resolved |
| 05 | record branches to QR · Web · API · Retail endpoints |
| 06 | inbound analytics dots traveling toward record |
| 07 | restrained next-life arc: Repair · Resale · Reuse |

---

## 4. Map autoplay + interaction

| Param | Value |
|---|---|
| Travel | **950ms** |
| Dwell | **2000ms** |
| Full cycle | ~7 × (0.95 + 2.0) ≈ **20.7s** |
| Manual pause | **6000ms** after click |
| Sequence | 1→…→7→reset→1 |
| Hover | contrast only; no stage change |
| Click | jump progress + update record + detail |
| Reduced motion | no path travel / micro-motion; instant stage swap |

State: `activeStage` (0–6) + `drawProgress` (0–1). Framer Motion `motion.path`, `AnimatePresence`, `useReducedMotion`.

---

## 5. Map → software bridge (“Follow the record”)

### 5.1 Layout

Shared ivory background — **no white flash, no bg flip**.

```
[ Lifecycle map section ]
        │ thin gold continuation line (same stroke family)
        ▼
[ Bridge scrolly — ~90–110vh ]
   · map fades / scales down
   · central record scales up + moves down 30–80px
   · software frame fades/slides up
   · abstract record crossfades into real screenshot of same product
        │ line becomes left walkthrough rail
        ▼
[ Follow the Record intro + sticky walkthrough ]
```

### 5.2 Copy

- Eyebrow: `FOLLOW THE RECORD`
- Bridge line: `Now see how one product moves through INTERTEXE.`
- Walkthrough headline: `See the record evolve.`
- Support: `Follow one product from fragmented source data to a governed record, live Digital Product Passport, and measurable product intelligence.`
- **Do not use** “Six ways teams work the record.”

### 5.3 Scroll mapping (`useScroll` on bridge ref)

| Property | From → To (tune visually) |
|---|---|
| Map opacity | 1 → 0.25 |
| Map scale | 1 → 0.97 |
| Central record scale | 1 → 1.08 |
| Central record y | 0 → 50 |
| Software frame opacity | 0 → 1 |
| Software frame y | 40 → 0 |
| Continuation line | map stub → vertical rail |

Pause map autoplay when bridge enters viewport (`IntersectionObserver`).

Illusion only — no true SVG→DOM morph.

---

## 6. Software walkthrough (rebuild presentation only)

Preserve existing six real screenshots. Rebuild layout + motion; do not fake UI.

### 6.1 Grid

| | |
|---|---|
| Content width | 1240–1360px |
| Columns | `minmax(240px, 0.32fr) minmax(0, 1fr)` (~260–320 / 780–920) |
| Gap | 48–64px |
| Sticky stage | `position: sticky; top: 104px` |
| Chapter height | ~75–85vh each |
| Frame aspect | ~16:10 fixed; `object-fit` / transform only |

Left rail = gold continuation line + stage labels (01–06). IntersectionObserver per chapter drives `activeStep`.

### 6.2 Screenshot assets + focus plan

| Stage | Asset | Focus / motion |
|---|---|---|
| 01 Source | `/platform/demo-source.png` | wide → pan into source inputs; cursor to PLM/ERP cluster |
| 02 Normalize | `/platform/demo-normalize.png` | highlight conflict vs normalized values |
| 03 Validate | `/platform/demo-validate.png` | highlight key indicators / evidence |
| 04 Publish | `/platform/demo-publish.png` | pan toward multi-channel outbound |
| 05 Activate | `/platform/demo-activate.png` | focus QR / live passport preview |
| 06 Measure | `/platform/demo-measure.png` | focus Material Benchmark / analytics |

Centralized config array (no per-JSX hardcoded cursors):

```
{ id, title, screenshot, initialScale, activeScale,
  initialX, initialY, activeX, activeY,
  cursorStart, cursorEnd, highlightRect?, annotation? }
```

Preload all six images before sticky region. Single absolute cursor element inside the frame. Prefer `translate3d` + `scale`; never animate width/height.

---

## 7. Mobile

| Element | Behavior |
|---|---|
| Map | Separate vertical journey; persistent record near top; simplified micro-signals |
| Bridge | Record still crossfades into first screenshot |
| Walkthrough | Stack: heading → screenshot → copy; no sticky split |
| Reduced motion | Instant swaps; no travel / pan / cursor |

---

## 8. Component isolation plan

| Path | Role |
|---|---|
| `app/platform/demo/_lifecycle-v2/*` | New map + bridge + walkthrough (build here) |
| `…/lifecycle-wireframe/page.tsx` | Review surface only |
| `ProductLifecycleSection.tsx` etc. | **Keep until approval** |
| `PlatformDemoClient.tsx` | **Unchanged until switch** |

Switch: replace map + wrap/replace walkthrough presentation; keep `SolutionsClose` at page bottom.

---

## 9. Failure checklist (reject if true)

- Seven-dot timeline / perfect circle / seven cards  
- Subway / HubSpot / spider / icon infographic  
- Huge dashboard card + orbiting mini-cards  
- Map and walkthrough as unrelated sections with a white gap  
- “Six ways teams work the record.” headline  

---

## 10. Approval gate

Wireframe at `/platform/demo/lifecycle-wireframe` must show:

1. Understandable horseshoe map with one central record  
2. Single detail region (not seven expanders)  
3. Clear downward continuation into Follow the Record  
4. Sticky walkthrough proportions with real screenshots sketched  
5. Premium ivory / charcoal / tan language  

**No production swap until this is approved.**
