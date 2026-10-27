# INTERTEXE Safari Web Extension — Apple setup

Safari on iPhone / Mac only shows extensions that ship **inside an App Store app**.
The web resources live in this repo; the App Store listing requires a Mac + Xcode step.

## What’s already done (this repo)

- `safari-web-extension/save-to-intertexe/` — Safari-ready MV3 package (parity with Chrome)
- Extension **version `1.0.4`** (matches App Store Connect version you set up)
- Capture API already accepts `sourceApp: "safari_extension"`
- 512 / 1024 icons for the containing app icon

## What you do on a Mac (required to appear on iPhone)

This Linux Cloud Agent **cannot** archive or upload an IPA — Apple requires Xcode on macOS.

Requires **Xcode 15+** (Safari 16.4+ / iOS 16.4+).

```bash
cd /path/to/intertexe
xcrun safari-web-extension-converter \
  ./safari-web-extension/save-to-intertexe \
  --project-location ./safari-web-extension/xcode \
  --app-name "INTERTEXE" \
  --bundle-identifier com.intertexe.safari \
  --ios-only \
  --force
```

Notes:

- Prefer **embedding into the existing INTERTEXE iOS app** instead of a separate App Store app when possible (one listing, one install). Open the main iOS Xcode project and add a **Safari Web Extension** target that points at `safari-web-extension/save-to-intertexe`.
- Set **Marketing Version / CFBundleShortVersionString = `1.0.4`** (and bump Build number) to match App Store Connect.
- Archive the **iOS** target → Distribute App → App Store Connect → Upload.
- After App Review + install, users enable it under **Settings → Apps → Safari → Extensions**. It then appears under **Browse Extensions → Installed**.

## Bundle / signing checklist

1. App Group / team ID matches the main INTERTEXE iOS app if you share auth.
2. Safari Web Extension capability enabled on the extension target.
3. Version **1.0.4** on both the app target and the Safari Web Extension target.
4. Privacy policy URL: `https://www.intertexe.com/privacy` (Safari section included).
5. App Store category + screenshots for the extension flow (save a PDP → Inspiration).
6. Test on a physical iPhone: open a retailer PDP in Safari → Aa / Extensions → INTERTEXE → Save.

## Syncing from Chrome

When Chrome changes, re-run:

```bash
node scripts/sync-safari-extension-from-chrome.mjs
```

Then re-test in Xcode Simulator / device before submitting.

## Until App Store review is approved

INTERTEXE will **not** appear on the iPhone “Browse Extensions” screen. That screen only lists App Store Safari extensions — Chrome Web Store packages never show there.
