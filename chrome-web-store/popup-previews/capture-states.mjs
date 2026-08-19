#!/usr/bin/env node
/**
 * Screenshot every popup state at 100% and 125% zoom.
 * Serves the extension folder over HTTP so chrome.* can be stubbed.
 */
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const folder = path.join(__dirname, "../save-to-intertexe");
const outDir = path.join(__dirname);
const artifactDir = "/opt/cursor/artifacts/screenshots";
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

const silk = "/fixtures/silk-slip-source.jpg";
const matchPhotos = [
  "/fixtures/silk-slip-match-1.jpg",
  "/fixtures/silk-slip-match-2.jpg",
  "/fixtures/silk-slip-match-3.jpg",
];

const peek = {
  title: "Rose Silk Slip Dress",
  brandName: "Hanamer",
  retailer: "hanamer.shop",
  imageUrl: silk,
  price: 333,
  currency: "EUR",
  compositionText: "silk",
};

const catalog = [
  ["The Row", "Silk Bias Slip", "€290", "https://www.net-a-porter.com/slip"],
  ["Lila", "Washable Silk Slip", "€198", "https://www.matchesfashion.com/slip"],
  ["Vince", "Charmeuse Midi Slip", "€245", "https://www.vince.com/slip"],
  ["Reformation", "Silk Bias Mini", "€178", "https://www.thereformation.com/slip"],
  ["Toteme", "Silk Slip Dress", "€320", "https://www.mytheresa.com/slip"],
  ["Khaite", "Silk Camisole Dress", "€410", "https://www.ssense.com/slip"],
  ["Gabriela Hearst", "Silk Column Slip", "€890", "https://www.net-a-porter.com/column"],
  ["Nanushka", "Washable Silk Slip", "€225", "https://www.nanushka.com/slip"],
  ["A.L.C.", "Silk Midi Slip", "€265", "https://www.shopbop.com/slip"],
  ["Equipment", "Silk Slip Dress", "€240", "https://www.equipmentfr.com/slip"],
  ["St. Agni", "Silk Bias Dress", "€210", "https://www.stagni.com/slip"],
  ["Matteau", "Silk Slip", "€255", "https://www.matteau-store.com/slip"],
];

const alts = catalog.map(([brand, name, priceLabel, url], i) => ({
  name,
  brandName: brand,
  brand_name: brand,
  imageUrl: matchPhotos[i % matchPhotos.length],
  composition: "100% silk",
  compositionLine: "100% Silk",
  price: Number(priceLabel.replace(/[^\d]/g, "")),
  currency: "EUR",
  priceLabel,
  url,
}));

function savedCapture(withAlts) {
  return {
    capture: {
      id: "cap_demo",
      title: "Rose Silk Slip Dress",
      brand_name: "Hanamer",
      retailer: "hanamer.shop",
      image_url: silk,
      price: 333,
      currency: "EUR",
      composition_text: "silk",
      alternatives: withAlts ? alts : [],
    },
    view: {
      title: "Rose Silk Slip Dress",
      brandLine: "Hanamer",
      priceLabel: "€333",
      materialHeadline: "Silk — percentage not provided",
      insight: { tone: "natural", label: "This mix is mostly natural" },
      alternativesTitle: `${alts.length} better-material matches`,
      alternatives: withAlts ? alts : [],
      openInIntertexeUrl: "https://www.intertexe.com/matches/cap_demo",
      affiliateDisclosure: "We may earn a commission if you buy from a TX Match.",
    },
    copy: {},
    links: { openInIntertexeUrl: "https://www.intertexe.com/matches/cap_demo" },
  };
}

const states = [
  {
    id: "signed-out-no-product",
    fixture: { signedIn: false, peekError: "Open a product page, then save." },
  },
  {
    id: "signed-out-product",
    fixture: { signedIn: false, peek },
  },
  {
    id: "signed-in-product",
    fixture: { signedIn: true, peek },
  },
  {
    id: "saved",
    fixture: { signedIn: true, peek, result: savedCapture(false), saveResult: savedCapture(false) },
  },
  {
    id: "results",
    fixture: { signedIn: true, peek, result: savedCapture(true), saveResult: savedCapture(true) },
  },
];

function installStub(fixture) {
  window.__ITX_FIXTURE__ = fixture;
  const respond = (msg) => {
    if (msg?.type === "GET_STATE") {
      return {
        signedIn: Boolean(fixture.signedIn),
        busy: false,
        result: fixture.result || null,
        peek: fixture.peek || null,
        status: fixture.status || "",
        error: Boolean(fixture.error),
      };
    }
    if (msg?.type === "PEEK_TAB") {
      if (fixture.peekError) return { error: fixture.peekError };
      return { peek: fixture.peek || null };
    }
    if (msg?.type === "SAVE_TAB") {
      if (fixture.saveResult) return { result: fixture.saveResult };
      return { peek: fixture.peek || null };
    }
    return { ok: true };
  };
  window.chrome = {
    runtime: {
      sendMessage: (msg) => Promise.resolve(respond(msg)),
      onMessage: { addListener() {} },
    },
  };
}

function startServer() {
  const fixtureDir = path.join(__dirname, "fixtures");
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const relative = urlPath === "/" ? "popup.html" : urlPath.replace(/^\//, "");
      const root = relative.startsWith("fixtures/") ? fixtureDir : folder;
      const file = path.normalize(
        relative.startsWith("fixtures/")
          ? path.join(fixtureDir, relative.slice("fixtures/".length))
          : path.join(folder, relative)
      );
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(file, (err, buf) => {
        if (err) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
        res.end(buf);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function shot(page, name, zoom) {
  await page.evaluate((z) => {
    document.documentElement.style.zoom = String(z);
  }, zoom);
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((img) =>
        img.complete ? null : new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        })
      )
    );
  });
  await new Promise((r) => setTimeout(r, 150));
  const box = await page.evaluate(() => {
    const shell = document.querySelector(".shell") || document.body;
    const rect = shell.getBoundingClientRect();
    return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
  });
  const clipW = Math.max(1, box.width);
  const clipH = Math.max(1, Math.min(box.height, zoom === 1 ? 620 : 775));
  const filename = `${name}-${zoom === 1 ? "100" : "125"}.png`;
  const dest = path.join(outDir, filename);
  await page.screenshot({
    path: dest,
    clip: { x: 0, y: 0, width: clipW, height: clipH },
    captureBeyondViewport: true,
  });
  fs.mkdirSync(artifactDir, { recursive: true });
  for (let i = 0; i < 3; i += 1) {
    try {
      fs.copyFileSync(dest, path.join(artifactDir, filename));
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  return { filename, width: clipW, height: clipH };
}

const server = await startServer();
const { port } = server.address();
const chromePath = process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";
const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

const summary = [];
try {
  fs.mkdirSync(outDir, { recursive: true });
  for (const state of states) {
    for (const zoom of [1, 1.25]) {
      const page = await browser.newPage();
      await page.setViewport({
        width: zoom === 1 ? 400 : 500,
        height: zoom === 1 ? 700 : 900,
        deviceScaleFactor: 1,
      });
      await page.evaluateOnNewDocument(installStub, state.fixture);
      await page.goto(`http://127.0.0.1:${port}/popup.html`, {
        waitUntil: "networkidle0",
        timeout: 15000,
      });
      await page.waitForFunction(() => document.body && document.getElementById("signIn"), { timeout: 8000 });
      await new Promise((r) => setTimeout(r, 250));
      const info = await shot(page, state.id, zoom);
      const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").trim());
      summary.push({ state: state.id, zoom, ...info, text: text.slice(0, 240) });
      await page.close();
    }
  }
} finally {
  await browser.close().catch(() => {});
  server.close();
}

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
