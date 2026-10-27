# Safari Web Extension (INTERTEXE: Fabric Scanner)

Web resources for the Apple Safari extension (iPhone + Mac). Same Capture API as Chrome; `sourceApp` is `safari_extension`.

| Path | Purpose |
|------|---------|
| `save-to-intertexe/` | MV3 extension (popup + background) |
| `APPLE-SETUP.md` | Mac / Xcode / App Store steps |
| `../scripts/sync-safari-extension-from-chrome.mjs` | Re-sync from Chrome package |

**Why it doesn’t show on iPhone yet:** Apple only lists App Store Safari extensions under Browse Extensions. This folder is the extension body; it becomes visible after you convert it with Xcode, ship it with the INTERTEXE iOS app (or a host app), and App Store review approves it.
