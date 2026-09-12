# Why Xcode Cloud builds 423 / 424 failed (and why this agent cannot make 425 green)

**Date:** 2026-08-21  
**Live App Store:** INTERTEXE: Fabric Scanner **1.0.2** (`com.stellarcommunications.intertexe`, id `6770476520`), released 2026-08-18.

## What the Xcode Cloud screenshot shows

| Build | When | Errors | Warnings | Last commit | Result |
|-------|------|--------|----------|-------------|--------|
| **424** | Today 9:42 AM | **1** | 9 | “Stop sending…” | Failed |
| **423** | Today 9:02 AM | **1** | 9 | “Stop sending…” | Failed |
| **422** | Aug 17, 5:22 PM | **0** | 9 | “Stop sending…” | Succeeded |

The 9 warnings are unchanged from the last **green** build. The new failure is **exactly one error**. All three rows show the same commit prefix, so 423 and 424 are rebuilds of the SHA that already shipped as 422 / App Store 1.0.2 — not a new website commit.

The website commit `2fe2d35` (“Stop sending TX Matches to a 404…”) is **19 Aug**, Chrome-extension/web only. It is not what Xcode Cloud compiled.

**Pushing `khiteriarab/intertexe` cannot turn 425 green.** This repo has zero `.swift` / `.xcodeproj` files. Xcode Cloud is compiling the iPhone app from the iOS git remote (424 historical builds). This Cursor agent only has the website clone and a GitHub token scoped to `khiteriarab/intertexe`.

## Why 423 / 424 fail with 1 error

Xcode Cloud archives **pushed git**, not the Mac working tree. Two explanations fit the screenshot:

1. **Local Swift/signing fixes were never committed + pushed** to the remote Xcode Cloud watches. Retrying `main` rebuilds the old SHA → same 1 error.
2. **Same SHA, stricter environment** (Xcode Cloud image bump). The known INTERTEXE compile gate is `ScannerView.swift` using `.auto` where the SDK wants `.automatic` / `.autoFocus` / `.never`. That can go from warning to **error** on a new image.

Open build **424** → the red ❌ → copy the single error. Until that line is in the iOS git that Xcode Cloud clones, retries stay red.

Also still true on device signing:

- Share Extension App Group must be enabled on the Apple team (`docs/SAVE_TO_INTERTEXE_CAPTURE.md`)

## What is on GitHub vs the Mac

| Place | What it is |
|-------|------------|
| `khiteriarab/intertexe` | Website. `main` clean and pushed. Not the iOS app. |
| `khiteriarab/intertexe-browser-extension` | Chrome extension. |
| `khiteriarab/intertexe-ios` | **Does not exist** (404). Xcode Cloud is **not** using this name. |
| `/Users/khiteri/Desktop/intertexe-ios/` | Real Xcode project + its own git remote (the one with 424 Xcode Cloud builds). |

## Fix on the Mac (this is the push that can make 425 succeed)

In Terminal on the founder Mac:

```bash
# optional: copy this script from the website repo
bash scripts/push-intertexe-ios-github.sh
```

The script now:

1. Opens `/Users/khiteri/Desktop/intertexe-ios` (or `INTERTEXE_IOS_ROOT`).
2. Uses the **existing** `origin` Xcode Cloud already builds — it does **not** point Xcode Cloud at a new empty repo.
3. Applies the known `ScannerView.swift` `.auto` compile fix when that token is present.
4. Commits uncommitted iOS work (excluding nested `intertexe-website/` and `browser-extension/`).
5. `git push` to that origin so Xcode Cloud can start **425**.

Then start a new Xcode Cloud build of `main` (or wait for the push webhook). Launch any future Cursor agent against the **iOS** git remote, not this website repo.
