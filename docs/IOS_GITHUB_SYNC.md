# Why INTERTEXE iOS is not on GitHub (so a new build cannot run)

**Date:** 2026-08-21  
**Live App Store:** INTERTEXE: Fabric Scanner **1.0.2** (`com.stellarcommunications.intertexe`, id `6770476520`), released 2026-08-18.

## What is actually on GitHub

| Repo | What it is | Last push (at audit) |
|------|------------|----------------------|
| `khiteriarab/intertexe` | Website + APIs (this repo). Clean `main`, up to date with origin. | 2026-08-21 |
| `khiteriarab/intertexe-browser-extension` | Chrome extension | 2026-08-18 |
| `khiteriarab/intertexe-ios` | **Does not exist** (GitHub 404) | — |

There are **no `.swift` / `.xcodeproj` files** in `khiteriarab/intertexe`. Cloud agents, Xcode Cloud, and GitHub Actions can only clone what is on GitHub — so they boot the website, not the iPhone app.

This cloud agent (`Intertexe-ios github sync`) was attached to `khiteriarab/intertexe`. It cannot commit or push iOS source that is not in this workspace.

## Where the iOS app actually lives

On the founder Mac only:

```
/Users/khiteri/Desktop/intertexe-ios/
  <Xcode app, Share Extension, NotificationService.swift, …>
  intertexe-website/     → already published as khiteriarab/intertexe
  browser-extension/     → already published as khiteriarab/intertexe-browser-extension
```

Evidence in this repo:

- Catalog dry-run logs import from `/Users/khiteri/Desktop/intertexe-ios/intertexe-website/lib/...`
- Chrome E2E logs use `/Users/khiteri/Desktop/intertexe-ios/browser-extension`
- `scripts/artifacts/scan-capture-durability-e2e.json` records iOS git SHAs `f9d78c2`, `23921cf`, `36158c3` as **installed on a device** (`ios_pushed`). Those SHAs are **not** in `khiteriarab/intertexe`. They exist only in the local iOS git history (or were never published).

Local Xcode → iPhone / TestFlight uploads do **not** publish source to GitHub. That is why GitHub looks stale while a phone build can still exist.

## Why a new GitHub / cloud / Xcode Cloud build cannot work

1. **No `intertexe-ios` GitHub repository** — nothing to clone.
2. **This website repo is not the iOS project** — attaching a Cursor Cloud Agent here cannot see Desktop files.
3. **Cursor Cloud VMs are Linux** — even after the repo exists, they cannot compile Xcode. App Store / TestFlight builds must run on a Mac (local Xcode or Xcode Cloud).
4. **Known local compile/signing gates** (from `docs/PRODUCTION_RELIABILITY_RELEASE.md` and `docs/SAVE_TO_INTERTEXE_CAPTURE.md`):
   - `ScannerView.swift` `.auto` compile failure must be fixed before a green archive.
   - Share Extension App Group must be enabled on the Apple Developer team + Xcode signing.

Website APIs the app already calls (scan capture upload, AASA, `/open`) **are** on `main`. Missing GitHub iOS source is the blocker, not an unpushed website commit.

## Fix (must run on the Mac that has the Xcode project)

```bash
# from this website repo, or copy the script onto the Mac
bash scripts/push-intertexe-ios-github.sh
```

The script:

1. Uses `/Users/khiteri/Desktop/intertexe-ios` (or `INTERTEXE_IOS_ROOT`).
2. Refuses to upload the nested website / browser-extension copies (those remotes already exist).
3. Writes an iOS `.gitignore` if missing.
4. Commits uncommitted iOS work.
5. Creates `khiteriarab/intertexe-ios` if needed (`gh repo create`).
6. Pushes `main`.

After that, launch the next Cursor agent **against `khiteriarab/intertexe-ios`**, and connect Xcode Cloud / Archive from that repo — not from this website repo.
