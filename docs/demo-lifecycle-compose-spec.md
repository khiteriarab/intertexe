# See It Live — Process Atlas Spec (v2)

**Status:** Wireframe approval only — no production switch  
**Review:** `/platform/demo/lifecycle-wireframe`  
**Motion convention:** `import { motion, AnimatePresence, useReducedMotion } from "framer-motion"`  
(`framer-motion@^12.23.24` in package.json; project does **not** use `motion/react`)

---

## Three moments only

1. **MAP** — self-contained process atlas (finished graphic even without scroll)  
2. **TRANSITION** — compact vertical connector + short copy (~220–300px)  
3. **WALKTHROUGH** — sticky real-software stages; scroll-driven

**Rejected (do not build):** oval/horseshoe, central product-record card, abstract↔real morph, full-viewport “Now see how…” bridge, dual preview cards.

---

## A. Lifecycle map — process atlas

| | |
|---|---|
| Canvas | **1180 × 540** viewBox (renders ~1100–1250 × 500–580) |
| Route | Serpentine / folded: **L→R top → DOWN → R→L bottom** |
| Base stroke | 1.75px `#d4cdc2` |
| Active stroke | 2.25px `#c4a574` |
| Anchors | 7 identical circles on the route |
| Labels | Top row **above**; bottom row **below**; consistent offsets |

### Anchors (viewBox)

| # | Stage | (x, y) | Label |
|---|---|---|---|
| 01 | Source & Make | **110, 145** | above |
| 02 | Clean & Connect | **370, 145** | above |
| 03 | Trace & Prove | **630, 145** | above |
| 04 | Check & Prepare | **920, 145** | above (turn starts here) |
| — | turn | **920, 145 → 920, 400** | — |
| 05 | Passport & Publish | **920, 400** | below |
| 06 | Use & Learn | **540, 400** | below |
| 07 | Repair & Recirculate | **180, 400** | below + partial end-loop |

### Route SVG (approx)

```
M 110 145
L 370 145
L 630 145
L 920 145
L 920 400
L 540 400
L 180 400
```

Slight corner radii via short cubics at bends (not a circle). After 07, a restrained partial loop for Repair / Resale / Reuse only.

### Stage surface copy

| # | Title | Descriptor |
|---|---|---|
| 01 | Source & Make | Materials · Suppliers · Manufacturing |
| 02 | Clean & Connect | One trusted product record |
| 03 | Trace & Prove | Claims linked to evidence |
| 04 | Check & Prepare | Compliance and DPP readiness |
| 05 | Passport & Publish | Governed identity distributed |
| 06 | Use & Learn | Intelligence from every channel |
| 07 | Repair & Recirculate | Beyond the first sale |

### Micro-diagrams (abstract, on-route)

| Stage | Signal |
|---|---|
| 01 | 3 thin strands → route: Materials, Suppliers, Manufacturing |
| 02 | irregular strokes → 4 aligned strokes |
| 03 | 2–3 evidence nodes attach from above |
| 04 | 2 incomplete ticks → complete |
| 05 | brief branch QR · WEB · API · RETAIL → rejoin |
| 06 | inbound signal dots |
| 07 | partial loop around Repair · Resale · Reuse |

### Map motion

- Dwell **2000ms** · travel **850ms** · pathLength gold progress  
- Active: filled anchor, gold number, stronger title, micro animates once  
- No layout shift, no glow, no stage block enlargement  
- `useReducedMotion`: static stage swap only  

Config: `lifecycleStages[]` with `anchorX/Y`, `labelPosition`, `microVisualType`, `detail`, `terms`.

---

## B. Transition — compact bridge

| | |
|---|---|
| Height | **~260px** total (not a viewport) |
| Connector | Vertical gold line from map exit (~below 07 / turn foot) |
| Breathing | **120–140px** of line before copy |
| Marker | Tiny circle mid-line |
| Eyebrow | FOLLOW THE RECORD |
| Headline | See the record evolve. |
| Support | Follow one product from fragmented source data to a governed record, live Digital Product Passport and measurable product intelligence. |

**No** screenshots, dual cards, morph, or repeated lifecycle stages.  
Line continues as the **same** left progress rail into the walkthrough.

Scroll: pause map autoplay; slight map opacity dip; extend connector; fade bridge copy — no map zoom-away.

---

## C. Walkthrough — sticky software

| | |
|---|---|
| Max width | 1280px |
| Grid | `280px minmax(0,1fr)` · gap **56px** |
| Sticky | `top: calc(nav + 32px)` · fixed 16:10 frame |
| Frame | 1px warm-gray · optional hairline shadow · screenshot fills frame |
| Chapters | ~75vh each · IntersectionObserver / useInView |
| Control | **Scroll only** — no screenshot autoplay |

Stages: Source → Normalize → Validate → Publish → Activate → Measure  
Assets: existing `/platform/demo-*.png`  
Config: `walkthroughStages[]` with scales, translates, cursor, highlight, annotation.

NORMALIZE example: crossfade → focus conflict panel → cursor → annotation `NORMALIZED VALUE`.

Headline: **See the record evolve.** (not “Six ways…”)

---

## Failure reject list

Oval · timeline · central card · morph · dual preview cards · full-screen bridge headline · small nested screenshots · white gap · discontinuous rail · stock icons.
