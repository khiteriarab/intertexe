#!/usr/bin/env node
/**
 * Rebuild safari-web-extension/save-to-intertexe from the Chrome package,
 * swapping sourceApp/source to safari_extension and refreshing the Safari manifest.
 *
 * Usage: node scripts/sync-safari-extension-from-chrome.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chromeDir = path.join(root, "chrome-web-store", "save-to-intertexe");
const safariDir = path.join(root, "safari-web-extension", "save-to-intertexe");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === "manifest.json") continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function rewriteJs(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const next = raw.replaceAll('"chrome_extension"', '"safari_extension"');
  fs.writeFileSync(filePath, next);
}

copyDir(chromeDir, safariDir);

for (const name of ["background.js", "popup.js", "capture-result.js"]) {
  const p = path.join(safariDir, name);
  if (fs.existsSync(p)) rewriteJs(p);
}

const chromeManifest = JSON.parse(fs.readFileSync(path.join(chromeDir, "manifest.json"), "utf8"));
const safariManifest = {
  ...chromeManifest,
  // Keep Safari marketing version independent of Chrome (App Store Connect build).
  version: "1.0.4",
  icons: {
    ...chromeManifest.icons,
    "512": "icons/icon512.png",
    "1024": "icons/icon1024.png",
  },
  browser_specific_settings: {
    safari: { strict_min_version: "16.4" },
  },
};
fs.writeFileSync(path.join(safariDir, "manifest.json"), `${JSON.stringify(safariManifest, null, 2)}\n`);

for (const size of [512, 1024]) {
  const large = path.join(safariDir, "icons", `icon${size}.png`);
  if (!fs.existsSync(large)) {
    console.warn(`Missing icons/icon${size}.png — regenerate before App Store (see APPLE-SETUP.md).`);
  }
}

const stillChrome = ["background.js", "popup.js"]
  .map((n) => path.join(safariDir, n))
  .filter((p) => fs.existsSync(p) && fs.readFileSync(p, "utf8").includes('"chrome_extension"'));
if (stillChrome.length) {
  console.error("Failed to rewrite sourceApp in:", stillChrome.join(", "));
  process.exit(1);
}

console.log("Synced Safari package from Chrome →", path.relative(root, safariDir));
console.log("Next on Mac: see safari-web-extension/APPLE-SETUP.md");
