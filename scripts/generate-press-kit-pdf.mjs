#!/usr/bin/env node
/**
 * Generate /public/intertexe-press-kit.pdf from the /press-kit page.
 * Requires a running Next server (default http://127.0.0.1:3000).
 *
 *   npm run dev   # in another terminal
 *   node scripts/generate-press-kit-pdf.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "public", "intertexe-press-kit.pdf");
const url = process.env.PRESS_KIT_URL || "http://127.0.0.1:3000/press-kit";

async function main() {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 120000 });
    await page.emulateMediaType("print");
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
    });
    const stat = fs.statSync(outPath);
    console.log(`Wrote ${outPath} (${Math.round(stat.size / 1024)} KB)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
