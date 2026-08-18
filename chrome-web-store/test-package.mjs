#!/usr/bin/env node
/**
 * Validate the 1.0.1 Chrome package. Does not submit or publish.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { createHash } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const folder = path.join(__dirname, "save-to-intertexe");
const zipPath = path.join(__dirname, "save-to-intertexe-1.0.1.zip");
const NAME = "INTERTEXE: Fabric Scanner";
const DESC =
  "Scan fabric composition as you shop, understand the material mix, find natural-fiber alternatives, and save pieces to INTERTEXE.";
const results = [];

function record(id, pass, detail = {}) {
  results.push({ id, pass: Boolean(pass), ...detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}${detail.note ? " — " + detail.note : ""}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
record("manifest.name", manifest.name === NAME, { actual: manifest.name });
record("manifest.description", manifest.description === DESC);
record("manifest.version", manifest.version === "1.0.1");
record("manifest.mv3", manifest.manifest_version === 3);
record("manifest.permissions", JSON.stringify(manifest.permissions) === JSON.stringify(["activeTab", "storage", "scripting", "tabs"]));
record(
  "manifest.host_permissions",
  JSON.stringify(manifest.host_permissions) === JSON.stringify(["https://www.intertexe.com/*"])
);
record("manifest.no_content_scripts", !manifest.content_scripts);
record("manifest.no_key", !manifest.key, { note: "new item; Google assigns the ID" });
record("description.length_le_132", String(manifest.description).length <= 132, {
  length: String(manifest.description).length,
});

const popupHtml = fs.readFileSync(path.join(folder, "popup.html"), "utf8");
record("popup.listing_name", popupHtml.includes(NAME));
record("popup.sign_in_cta", /Sign in to INTERTEXE/i.test(popupHtml));
record("popup.no_token_paste", !/Paste Supabase/i.test(popupHtml));

const bg = fs.readFileSync(path.join(folder, "background.js"), "utf8");
record("bg.save_inject_only", bg.includes('msg?.type === "SAVE_TAB"') && bg.includes("executeScript"));
record("bg.no_pageSignals_transmit", !bg.includes("pageSignals"));
record("bg.intertexe_only", !/fetch\(\s*`https:\/\/(?!www\.intertexe\.com)/.test(bg));
record("bg.no_secrets", !/service_role|SUPABASE_SERVICE|sk-/.test(bg));

const zipBuf = fs.readFileSync(zipPath);
const unzipList = execSync(`unzip -l ${JSON.stringify(zipPath)}`, { encoding: "utf8" });
record("zip.manifest_at_root", /^\s+\d+\s+.*\smanifest\.json$/m.test(unzipList) && !unzipList.includes("save-to-intertexe/manifest.json"));
record("zip.no_upload_notes", !unzipList.includes("GOOGLE-UPLOAD") && !unzipList.includes("PERMISSIONS-AND-DATA") && !unzipList.includes("test-package"));
record("zip.sha256", true, { sha256: createHash("sha256").update(zipBuf).digest("hex"), bytes: zipBuf.length });

const privacy = fs.readFileSync(path.join(__dirname, "../app/privacy/page.tsx"), "utf8");
record("privacy.chrome_section", /INTERTEXE: Fabric Scanner/.test(privacy) && /Save this page/.test(privacy));
record("privacy.auth", /access token|refresh token/i.test(privacy));
record("privacy.clickout", /click-out|click out|retailer click/i.test(privacy));
record("privacy.retention_deletion", /delete your account/i.test(privacy) && /chrome\.storage/i.test(privacy));

let chromeOk = false;
try {
  const require = createRequire(import.meta.url);
  const puppeteer = require("puppeteer");
  const chromePath = process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "itx-ext-"));
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    pipe: true,
    enableExtensions: [folder],
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    userDataDir,
  });
  await new Promise((r) => setTimeout(r, 1500));
  const targets = typeof browser.targets === "function" ? browser.targets() : [];
  const extTarget = targets.find((t) => String(t.url?.() || t.url || "").startsWith("chrome-extension://"));
  let extensionId = null;
  if (extTarget) {
    extensionId = new URL(extTarget.url()).host;
  }
  if (!extensionId) {
    const pref = path.join(userDataDir, "Default", "Preferences");
    if (fs.existsSync(pref)) {
      const json = JSON.parse(fs.readFileSync(pref, "utf8"));
      for (const [id, meta] of Object.entries(json?.extensions?.settings || {})) {
        if (meta?.manifest?.name === NAME || String(meta?.path || "").includes("save-to-intertexe")) {
          extensionId = id;
          break;
        }
      }
    }
  }
  chromeOk = Boolean(extensionId);
  record("chrome.unpacked_load", chromeOk, { extensionId, note: "local test ID; store ID comes after New item" });

  if (extensionId) {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForFunction(
      () => {
        const section = document.getElementById("signedOut");
        const btn = document.getElementById("signIn");
        return (
          section &&
          !section.classList.contains("hidden") &&
          /Sign in to INTERTEXE/i.test(btn?.textContent || "")
        );
      },
      { timeout: 8000 }
    ).catch(() => null);
    const ui = await page.evaluate(() => ({
      name: document.querySelector("h1")?.textContent || "",
      cta: document.getElementById("signIn")?.textContent || "",
      signedOutHidden: document.getElementById("signedOut")?.classList.contains("hidden"),
    }));
    record("chrome.popup_name", ui.name === NAME, ui);
    record("chrome.popup_cta", /Sign in to INTERTEXE/i.test(ui.cta) && ui.signedOutHidden === false, ui);

    const samplePage = await browser.newPage();
    await samplePage.setContent(`<!doctype html>
      <html><head>
        <meta property="og:title" content="Silk Slip Dress">
        <meta property="og:image" content="https://example.com/dress.jpg">
        <link rel="canonical" href="https://example.com/products/silk-slip">
      </head>
      <body>
        <h1>Silk Slip Dress</h1>
        <p>100% silk</p>
        <script type="application/ld+json">{"@type":"Product","brand":{"name":"Example"},"offers":{"price":"240","priceCurrency":"USD"}}</script>
      </body></html>`);
    const extractSrc = fs.readFileSync(path.join(folder, "background.js"), "utf8");
    const start = extractSrc.indexOf("function extractProductFromPage()");
    const end = extractSrc.indexOf("async function extractActiveTab()");
    const fn = extractSrc.slice(start, end);
    const product = await samplePage.evaluate((src) => {
      // eslint-disable-next-line no-new-func
      const extract = new Function(`${src}; return extractProductFromPage();`);
      return extract();
    }, fn);
    record(
      "extract.sample_pdp",
      product?.title === "Silk Slip Dress" &&
        product?.originalUrl?.includes("silk-slip") &&
        product?.brandName === "Example" &&
        product?.price === 240 &&
        /silk/i.test(product?.compositionText || ""),
      { product }
    );
    await samplePage.close();
  }

  await browser.close().catch(() => {});
} catch (e) {
  record("chrome.unpacked_load", false, { error: String(e.message || e) });
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
if (failed.length) {
  console.error(failed);
  process.exit(1);
}
process.exit(0);
