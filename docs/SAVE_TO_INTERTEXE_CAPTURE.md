# Save to INTERTEXE — Capture System Design

Customer language: **Save to INTERTEXE** · **Decode This** · **Love the shape? See it in better materials.**

This system is separate from website banners and universal links. One Capture API serves in-app paste/photo, iOS Share Extension, and (later) browser extensions.

---

## 1. Existing-code audit

| Area | What exists | Gap for capture |
| --- | --- | --- |
| Scanner | `ScannerService` → `POST /api/scan`; URL / image / barcode / composition; `url_compositions`, `barcode_compositions` | Scan results are ephemeral + scan history — not first-class external saves |
| Collections | `user_collections` / `user_collection_items` (canvas layout); Favorites hub | Items are catalog `product_id` only |
| Favorites | `product_favorites` | Catalog IDs only |
| Catalog | `products` / live catalog; protected write paths | Must never be overwritten by external captures |
| Auth | Supabase Auth + Bearer on scan APIs | Share Extension needs App Group shared session |
| Share Extension | None | Phase 3 |
| Browser extension | None | Phase 4 — same Capture API |

**Reuse:** resolution ladder already in `/api/scan` + composition caches. Capture soft-links `matched_product_id` when verified; never inserts/updates catalog rows.

---

## 2. Supabase schema proposal

Migration: `supabase/migrations/20260806_external_captures.sql` (ios + website copies).

- **`external_captures`** — external item of record (URL/image metadata, resolution + material status, alternatives JSON, soft match)
- **`capture_events`** — funnel analytics
- **`user_collection_items`** extended: `item_kind` (`catalog_product` | `external_capture`), nullable `product_id`, `capture_id`
- Storage bucket **`external-captures`** (private, 5MB, jpeg/png/webp/heic)

Item types: `catalog_product` | `external_product` | `captured_url` | `captured_image`  
Resolution: `saved` → `queued` → `resolving` → `analyzed` | `alternatives_ready` | `failed`  
Material: `verified` | `source_page` | `ai_estimated` | `unknown` — **never label AI as verified**

---

## 3. Capture API design

Base: `https://www.intertexe.com/api/capture` (Bearer auth)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/capture` | Create capture (URL and/or image). `decodeNow` queues async decode. Immediate `saved`/`queued` response |
| `GET` | `/api/capture` | List recent captures |
| `GET` | `/api/capture/[id]` | Fetch one |
| `POST` | `/api/capture/[id]/decode` | **Decode This** |
| `POST` | `/api/capture/events` | Analytics (`original_source_clicked`, `alternatives_viewed`, …) |

Create body (subset): `originalUrl`, `imageUrl`, `imageBase64`, `title`, `retailer`, `brandName`, `price`, `currency`, `compositionText`, `sku`, `collectionId`, `sourceApp`, `itemType`, `decodeNow`.

Guards: auth, HTTPS URL sanitize + UTM strip, 5MB image, 30 captures/hour/user, duplicate by `url_hash` / `image_hash`.

---

## 4. Scanner / resolution reuse plan

Decode path (same ladder as scanner, write results only to `external_captures`):

1. Exact URL / SKU / product-ID → `url_compositions` / catalog soft-match  
2. Structured source-page metadata via `/api/scan`  
3. Retailer / title / image matching inside scan  
4. Semantic / visual inference (`ai_assist`) → status **`ai_estimated`**  
5. Garment-category / silhouette fallback for alternatives  

Matched catalog IDs stored as `matched_product_id` only. Alternatives stored as JSON + shown in-app with catalog product cards when IDs resolve.

---

## 5. Collections integration plan

- Save writes `collection_id` on capture + `user_collection_items` row with `item_kind = external_capture`
- Collections UI shows external items alongside catalog pieces with clear **External** / retailer source badge
- Tap → **INTERTEXE detail** (`CaptureDetailView`), not silent redirect
- Separate action: **View Original Source** (preserves original URL; affiliate only when merchant relationship exists)

---

## 6. iOS Share Extension plan (Phase 3)

- Target: **Save to INTERTEXE**
- Accept: URLs, webpage, images, useful text
- Lightweight sheet: preview, collection picker, Decode now, save
- App Group for shared auth session; unsigned → pending handoff / open main app
- Posts to same Capture API with `sourceApp: ios_share_extension`

---

## 7. Browser-extension plan (Phase 4 — after Phase 1–2 stable)

- Chrome + Safari Web Extension
- Detect likely PDP; extract URL, title, image, price, retailer, SKU, composition
- Save via Capture API (`chrome_extension` / `safari_extension`)
- Show material status + open alternatives
- **No separate backend**

---

## 8. Risks and dependencies

| Risk | Mitigation |
| --- | --- |
| Polluting verified catalog | Separate tables; no catalog writes from capture |
| AI shown as verified | Explicit `material_status` + UI labels |
| Share Extension auth | App Group + pending queue |
| Storage / cost | 5MB limit, private bucket, rate limits |
| Migration not applied | Apply `20260806_external_captures.sql` before production use |
| Affiliate compliance | Keep original URL; affiliate only with contract |
| Collection schema break | Additive columns; dual unique indexes |

---

## 9. Phased estimate

| Phase | Scope | Estimate |
| --- | --- | --- |
| **1** | Schema + Capture API + events + design | Done — migration applied to production Supabase |
| **2** | In-app URL + photo + collections + Decode This + detail | Done (in-app Save to INTERTEXE) |
| **3** | iOS Share Extension + App Group auth | In progress — target + App Group wired; enable App Group on Apple Developer / Xcode signing |
| **4** | Chrome/Safari extension | 2–3 weeks after Phase 1–2 stable in production |
| Polish | Collections mixed grid, affiliate attribution, analytics dashboards | Ongoing |

**Do not start Phase 4 until Phase 1–2 are stable in production.**
