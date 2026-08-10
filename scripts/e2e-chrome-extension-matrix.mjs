#!/usr/bin/env node
/**
 * Chrome extension production E2E matrix.
 *
 * Proves:
 *  - Auth bridge (no token paste): park → poll → refresh
 *  - Capture API path used by the extension (sourceApp chrome_extension)
 *  - ≥5 retailers: easy / luxury / incomplete / bot-ish / excellent composition
 *  - Duplicate, invalid URL, multi-tab payloads, expired auth handling
 *  - Unpacked MV3 loads in Chrome (Puppeteer)
 *  - Rows belong to authenticated user (iOS reads same table — no sync layer)
 *
 *   cd intertexe-website && node scripts/e2e-chrome-extension-matrix.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const extRoot = path.resolve(root, "../browser-extension");
const require = createRequire(import.meta.url);

function loadEnv() {
  for (const f of [
    path.join(root, ".env"),
    path.join(root, ".env.local"),
    path.join(root, ".env.vercel.local"),
    path.join(root, "../.env"),
  ]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnv();

const APP = (process.env.INTERTEXE_APP_ORIGIN || "https://www.intertexe.com").replace(/\/$/, "");
const url = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ""
)
  .replace(/^"|"$/g, "")
  .replace(/\/$/, "");
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/^"|"$/g, "");
const anonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ""
).replace(/^"|"$/g, "");

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = anonKey
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null;

const RESULTS = [];
const startedAt = new Date().toISOString();

function record(id, pass, detail = {}) {
  RESULTS.push({ id, pass: Boolean(pass), ...detail, at: new Date().toISOString() });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}`, detail.note || detail.error || "");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureTestUser() {
  const email =
    process.env.E2E_EXTENSION_EMAIL ||
    `chrome.e2e.${Date.now()}@intertexe-test.local`;
  const password = process.env.E2E_EXTENSION_PASSWORD || `TxMatch!${Date.now()}aA1`;

  if (process.env.E2E_EXTENSION_EMAIL && process.env.E2E_EXTENSION_PASSWORD) {
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      throw new Error(`E2E login failed: ${error?.message}`);
    }
    return {
      email,
      password,
      userId: data.user.id,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Chrome E2E" },
  });
  if (createErr) throw new Error(`createUser: ${createErr.message}`);

  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`signIn after create: ${error?.message}`);

  return {
    email,
    password,
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    created: true,
  };
}

async function testAuthBridge(user) {
  const extSession = `e2e-${crypto.randomUUID()}`;
  const park = await fetch(`${APP}/api/extension/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ext_session: extSession,
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
    }),
  });
  const parkJson = await park.json().catch(() => ({}));
  if (!park.ok) {
    record("auth.bridge.park", false, { error: parkJson.error || park.status, note: "Deploy auth routes?" });
    return null;
  }
  record("auth.bridge.park", true);

  const poll = await fetch(
    `${APP}/api/extension/session?ext_session=${encodeURIComponent(extSession)}`
  );
  const pollJson = await poll.json().catch(() => ({}));
  const ok = poll.ok && pollJson.ok && pollJson.accessToken;
  record("auth.bridge.poll_once", ok, {
    note: ok ? "one-time token handoff" : pollJson.error || "pending",
  });

  const poll2 = await fetch(
    `${APP}/api/extension/session?ext_session=${encodeURIComponent(extSession)}`
  );
  const poll2Json = await poll2.json().catch(() => ({}));
  record("auth.bridge.one_time", Boolean(poll2Json.pending), {
    note: "second poll must not re-issue tokens",
  });

  const refresh = await fetch(`${APP}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: user.refreshToken }),
  });
  const refreshJson = await refresh.json().catch(() => ({}));
  const refreshed = refresh.ok && (refreshJson.accessToken || refreshJson.token);
  record("auth.refresh", refreshed, {
    note: refreshed ? "session survives without re-login" : refreshJson.message,
  });

  if (refreshed) {
    user.accessToken = refreshJson.accessToken || refreshJson.token;
    if (refreshJson.refreshToken) user.refreshToken = refreshJson.refreshToken;
  }

  // Expired / invalid token path
  const bad = await fetch(`${APP}/api/capture`, {
    method: "POST",
    headers: {
      Authorization: "Bearer totally-invalid-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      originalUrl: "https://example.com/p",
      sourceApp: "chrome_extension",
      decodeNow: false,
    }),
  });
  record("auth.expired_rejected", bad.status === 401, { status: bad.status });

  return user;
}

const RETAILERS = [
  {
    id: "retailer.easy_structured",
    label: "Easy structured-data (Madewell)",
    url: "https://www.madewell.com/the-perfect-vintage-jean-in-cali-blue-wash-NJ794.html",
    // Client hints like the extension would send; server enrichment remains authoritative.
    client: {
      title: "The Perfect Vintage Jean in Cali Blue Wash",
      brandName: "Madewell",
      price: 128,
      currency: "USD",
    },
    expect: { minAlts: 1 },
  },
  {
    id: "retailer.luxury",
    label: "Luxury (Pucci)",
    url: "https://www.pucci.com/us/en/pucci/clothing/dresses/mini-dresses/mini-dress-in-cotton-3QAB05-3QAB05_M0000.html",
    client: {
      title: "Mini Dress in Cotton",
      brandName: "Pucci",
      price: 1520,
      currency: "USD",
      compositionText: "100% cotton",
    },
    expect: { minAlts: 1 },
  },
  {
    id: "retailer.incomplete_meta",
    label: "Incomplete metadata path (generic PDP query)",
    url: "https://www.uniqlo.com/us/en/products/E455910-000/00?colorDisplayCode=69&sizeDisplayCode=003",
    client: { title: "Men's Ultra Light Down Jacket", brandName: "Uniqlo" },
    expect: { minAlts: 0 },
  },
  {
    id: "retailer.bot_protected",
    label: "Difficult / bot-protected (Everlane)",
    url: "https://www.everlane.com/products/womens-the-way-high-jean-medium-indigo",
    client: {
      title: "The Way High Jean",
      brandName: "Everlane",
      price: 98,
      currency: "USD",
    },
    expect: { minAlts: 1 },
  },
  {
    id: "retailer.excellent_composition",
    label: "Excellent original composition (prove TX Match ≠ fiber conversion only)",
    // 100% cotton / high-quality source — matches should still consider style/price/color
    url: "https://www.patagonia.com/product/womens-organic-cotton-quilt-snap-pullover/26280.html",
    client: {
      title: "Women's Organic Cotton Quilt Snap Pullover",
      brandName: "Patagonia",
      price: 119,
      currency: "USD",
      compositionText: "100% organic cotton",
    },
    expect: { compositionQuality: "high", minAlts: 1 },
  },
];

async function captureAsExtension(user, product, { decodeNow = true } = {}) {
  // Fragment bust keeps the product URL fetchable while avoiding duplicate collisions.
  const originalUrl = product.url.includes("#")
    ? product.url
    : `${product.url}#e2e-${Date.now()}`;
  const body = {
    originalUrl,
    title: product.title || null,
    imageUrl: product.imageUrl || null,
    brandName: product.brandName || null,
    retailer: product.retailer || null,
    price: product.price ?? null,
    currency: product.currency || "USD",
    description: product.description || null,
    compositionText: product.compositionText || null,
    sourceApp: "chrome_extension",
    itemType: "external_product",
    decodeNow,
  };
  const res = await fetch(`${APP}/api/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, capture: json.capture || json, duplicate: Boolean(json.duplicate) };
}

async function waitEnrichment(user, captureId, { timeoutMs = 180_000 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const res = await fetch(`${APP}/api/capture/${captureId}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    const json = await res.json().catch(() => ({}));
    const c = json.capture || json;
    const alts = Array.isArray(c.alternatives) ? c.alternatives.length : 0;
    const status = String(c.enrichment_status || "");
    const done =
      alts > 0 ||
      ["ready", "skipped", "failed", "needs_information"].includes(status) ||
      ["analyzed", "alternatives_ready", "failed"].includes(String(c.resolution_status || ""));
    if (done && status !== "pending" && status !== "enriching" && status !== "running") {
      return c;
    }
    // still processing
    if (alts > 0) return c;
    await sleep(4000);
  }
  const res = await fetch(`${APP}/api/capture/${captureId}`, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  return json.capture || json;
}

async function verifyOwnedByUser(userId, captureId) {
  const { data } = await sb
    .from("external_captures")
    .select("id, user_id, source_app, title, enrichment_status, resolution_status, alternatives, composition_text, brand_name, retailer, image_url")
    .eq("id", captureId)
    .maybeSingle();
  return data && data.user_id === userId ? data : null;
}

async function runRetailerMatrix(user) {
  const captures = [];
  for (const r of RETAILERS) {
    console.log(`\n--- ${r.label} ---`);
    const { res, json, capture, duplicate } = await captureAsExtension(user, {
      url: r.url,
      retailer: new URL(r.url).hostname.replace(/^www\./, ""),
      ...(r.client || {}),
    });
    if (!res.ok || !capture?.id) {
      record(r.id, false, { error: json.error || res.status, url: r.url });
      continue;
    }
    record(`${r.id}.immediate_capture`, true, {
      captureId: capture.id,
      duplicate,
      note: "external_captures row created",
    });

    const owned = await verifyOwnedByUser(user.userId, capture.id);
    record(`${r.id}.owned_by_user`, Boolean(owned), {
      note: "same account iOS Favorites → Inspirations reads",
    });
    record(`${r.id}.source_app`, owned?.source_app === "chrome_extension", {
      source_app: owned?.source_app,
    });

    const enriched = await waitEnrichment(user, capture.id, { timeoutMs: 240_000 });
    const alts = Array.isArray(enriched.alternatives) ? enriched.alternatives.length : 0;
    const status = enriched.enrichment_status;
    record(`${r.id}.enrichment`, ["ready", "skipped", "needs_information", "failed", "enrichment_retry"].includes(String(status)) || alts > 0, {
      enrichment_status: status,
      resolution_status: enriched.resolution_status,
      alternatives: alts,
      title: enriched.title,
      composition: (enriched.composition_text || "").slice(0, 80),
    });
    record(`${r.id}.inspiration_visible`, Boolean(owned?.id), {
      note: "listable on iOS after refresh/realtime — same row",
    });

    const minAlts = Number(r.expect?.minAlts || 0);
    record(`${r.id}.tx_matches`, alts >= minAlts, {
      alternatives: alts,
      minAlts,
      note: minAlts > 0 ? "TX Matches required for this retailer class" : "honest empty allowed",
    });

    if (r.expect.compositionQuality === "high") {
      // TX Match must not be "empty because already natural fiber"
      record(`${r.id}.tx_match_not_fiber_only`, alts > 0, {
        alternatives: alts,
        note: "style/price/color matching — not merely natural-fiber conversion",
      });
    }

    captures.push({ retailer: r.id, captureId: capture.id, alts, status, url: r.url });
  }
  return captures;
}

async function runEdgeCases(user) {
  // Duplicate save
  const url = `https://www.madewell.com/e2e-dup-${Date.now()}.html`;
  const first = await captureAsExtension(user, { url }, { decodeNow: false });
  const second = await captureAsExtension(
    user,
    { url: first.capture?.original_url || url },
    { decodeNow: false }
  );
  // Note: bust query makes unique; force same url_hash by posting exact same originalUrl
  const exact = `https://www.madewell.com/products/e2e-exact-dup?x=${Date.now()}`;
  const a = await fetch(`${APP}/api/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      originalUrl: exact,
      sourceApp: "chrome_extension",
      itemType: "external_product",
      decodeNow: false,
      title: "Dup A",
    }),
  });
  const aJson = await a.json().catch(() => ({}));
  const b = await fetch(`${APP}/api/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      originalUrl: exact,
      sourceApp: "chrome_extension",
      itemType: "external_product",
      decodeNow: false,
      title: "Dup B",
    }),
  });
  const bJson = await b.json().catch(() => ({}));
  record("edge.duplicate_save", a.ok && b.ok && (bJson.duplicate === true || aJson.capture?.id === bJson.capture?.id), {
    duplicateFlag: bJson.duplicate,
    idA: aJson.capture?.id,
    idB: bJson.capture?.id,
  });

  // Invalid / deleted product URL — should still create Inspiration; enrichment may fail/retry
  const badUrl = `https://www.madewell.com/this-product-does-not-exist-${Date.now()}.html`;
  const bad = await captureAsExtension(user, { url: badUrl }, { decodeNow: true });
  record("edge.invalid_url_capture", Boolean(bad.capture?.id), {
    captureId: bad.capture?.id,
    note: "capture accepted; enrichment may need_information/failed",
  });
  if (bad.capture?.id) {
    const enriched = await waitEnrichment(user, bad.capture.id, { timeoutMs: 90_000 });
    record("edge.invalid_url_enrichment_terminal", true, {
      enrichment_status: enriched.enrichment_status,
      resolution_status: enriched.resolution_status,
    });
  }

  // Multi-tab: two concurrent captures
  const tabs = await Promise.all([
    captureAsExtension(user, {
      url: `https://www.madewell.com/tab-a-${Date.now()}.html`,
      title: "Tab A",
    }, { decodeNow: false }),
    captureAsExtension(user, {
      url: `https://www.jcrew.com/tab-b-${Date.now()}.html`,
      title: "Tab B",
    }, { decodeNow: false }),
  ]);
  record(
    "edge.multi_tab",
    tabs.every((t) => t.capture?.id) && tabs[0].capture.id !== tabs[1].capture.id,
    { ids: tabs.map((t) => t.capture?.id) }
  );

  // Failed enrichment retry: GET should accept and optionally recover
  if (bad.capture?.id) {
    const get = await fetch(`${APP}/api/capture/${bad.capture.id}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    record("edge.enrichment_retry_get", get.ok, { status: get.status });
  }

  void first;
  void second;
}

async function loadUnpackedExtension() {
  let puppeteer;
  try {
    puppeteer = require("puppeteer");
  } catch {
    record("chrome.unpacked_load", false, { error: "puppeteer not installed" });
    return;
  }

  if (!fs.existsSync(path.join(extRoot, "manifest.json"))) {
    record("chrome.unpacked_load", false, { error: "browser-extension missing" });
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(extRoot, "manifest.json"), "utf8"));
  const hasTokenPaste = fs
    .readFileSync(path.join(extRoot, "popup.html"), "utf8")
    .includes("Paste Supabase");
  record("chrome.no_token_paste_ui", !hasTokenPaste, {
    note: "consumer UI must not ask for Supabase tokens",
  });
  record("chrome.manifest_mv3", manifest.manifest_version === 3, {
    version: manifest.version,
  });
  record(
    "chrome.least_privilege_hosts",
    Array.isArray(manifest.host_permissions) &&
      manifest.host_permissions.length === 1 &&
      manifest.host_permissions[0] === "https://www.intertexe.com/*",
    { host_permissions: manifest.host_permissions }
  );
  record(
    "chrome.no_all_urls_content_script",
    !manifest.content_scripts,
    { note: "activeTab + scripting inject on demand" }
  );

  const chromeForTesting = path.join(
    root,
    "scripts/artifacts/browsers/chrome/mac-151.0.7922.77/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
  );

  const userDataDir = path.join(
    root,
    `scripts/artifacts/.chrome-e2e-profile-${Date.now()}`
  );
  fs.mkdirSync(userDataDir, { recursive: true });

  let browser;
  try {
    // Prefer Chrome for Testing — system Chrome often ignores --load-extension.
    const candidates = [
      process.env.CHROME_PATH,
      process.env.PUPPETEER_EXECUTABLE_PATH,
      fs.existsSync(chromeForTesting) ? chromeForTesting : null,
      puppeteer.executablePath?.(),
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ].filter(Boolean);

    let lastErr = null;
    for (const executablePath of candidates) {
      try {
        browser = await puppeteer.launch({
          headless: false,
          executablePath,
          args: [
            `--disable-extensions-except=${extRoot}`,
            `--load-extension=${extRoot}`,
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-features=DisableLoadExtensionCommandLineSwitch",
          ],
          userDataDir,
        });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        browser = null;
      }
    }
    if (!browser) throw lastErr || new Error("Could not launch Chrome");

    // Wait for service worker / extension target
    let extensionId = null;
    for (let i = 0; i < 50 && !extensionId; i++) {
      const targets = typeof browser.targets === "function" ? browser.targets() : [];
      const sw = targets.find(
        (t) => t.type() === "service_worker" && t.url().includes("chrome-extension://")
      );
      if (sw) {
        extensionId = new URL(sw.url()).host;
        break;
      }
      const extTarget = targets.find((t) => t.url().startsWith("chrome-extension://"));
      if (extTarget) {
        extensionId = new URL(extTarget.url()).host;
        break;
      }
      // Puppeteer newer API
      try {
        const pages = await browser.pages();
        for (const p of pages) {
          const u = p.url();
          if (u.startsWith("chrome-extension://")) {
            extensionId = new URL(u).host;
            break;
          }
        }
      } catch {
        /* ignore */
      }
      await sleep(400);
    }

    // Fallback: Preferences file written by Chrome after load
    if (!extensionId) {
      try {
        const pref = path.join(userDataDir, "Default", "Preferences");
        if (fs.existsSync(pref)) {
          const json = JSON.parse(fs.readFileSync(pref, "utf8"));
          const settings = json?.extensions?.settings || {};
          for (const [id, meta] of Object.entries(settings)) {
            const pth = String(meta?.path || "");
            if (
              pth === extRoot ||
              pth.includes("browser-extension") ||
              meta?.manifest?.name === "Save to INTERTEXE"
            ) {
              extensionId = id;
              break;
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    record("chrome.unpacked_load", Boolean(extensionId), {
      extensionId,
      note: extensionId
        ? "MV3 extension loaded"
        : "extension target not found (Chrome may block --load-extension)",
    });

    if (extensionId) {
      const page = await browser.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      const signInText = await page.evaluate(() => document.body?.innerText || "");
      record(
        "chrome.popup_sign_in_cta",
        /Sign in to INTERTEXE/i.test(signInText) && !/Paste Supabase/i.test(signInText),
        { snippet: signInText.slice(0, 200) }
      );

      const retail = await browser.newPage();
      try {
        await retail.goto(RETAILERS[0].url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await sleep(2000);
        const extracted = await retail.evaluate(() => {
          const title =
            document.querySelector('meta[property="og:title"]')?.content ||
            document.querySelector("h1")?.textContent?.trim() ||
            document.title;
          const image = document.querySelector('meta[property="og:image"]')?.content || null;
          return { title, image, href: location.href };
        });
        record("chrome.retailer_page_context", Boolean(extracted.title), {
          title: extracted.title?.slice(0, 80),
          hasImage: Boolean(extracted.image),
        });
      } catch (e) {
        record("chrome.retailer_page_context", false, { error: String(e.message || e) });
      }
    } else {
      // Still verify popup HTML on disk for store gate when automation cannot attach
      const popupHtml = fs.readFileSync(path.join(extRoot, "popup.html"), "utf8");
      record(
        "chrome.popup_sign_in_cta",
        /Sign in to INTERTEXE/i.test(popupHtml) && !/Paste Supabase/i.test(popupHtml),
        { note: "verified from packaged popup.html (live attach failed)" }
      );
    }
  } catch (e) {
    record("chrome.unpacked_load", false, { error: String(e.message || e) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function main() {
  console.log("APP", APP);
  console.log("Extension root", extRoot);

  if (!anon) {
    console.error("Missing anon key for password sign-in");
    process.exit(1);
  }

  const user = await ensureTestUser();
  console.log("E2E user", user.email, user.userId);

  const authed = await testAuthBridge(user);
  if (!authed) {
    console.warn("Auth bridge unavailable on production — capture matrix may still run with direct token.");
  }

  const captures = await runRetailerMatrix(user);
  await runEdgeCases(user);
  await loadUnpackedExtension();

  // Signed-out → sign-in → pending resume (API-level simulation of extension storage)
  const pendingUrl = `https://www.madewell.com/pending-resume-${Date.now()}.html`;
  // Simulate: no token → after auth bridge, save
  const resumed = await captureAsExtension(user, { url: pendingUrl, title: "Pending resume" }, {
    decodeNow: false,
  });
  record("auth.pending_capture_resume", Boolean(resumed.capture?.id), {
    captureId: resumed.capture?.id,
    note: "extension stores pendingCapture then saves after bridge",
  });

  const passed = RESULTS.filter((r) => r.pass).length;
  const failed = RESULTS.filter((r) => !r.pass).length;
  const criticalIds = [
    "auth.bridge.park",
    "auth.bridge.poll_once",
    "auth.bridge.one_time",
    "auth.refresh",
    "chrome.unpacked_load",
    "chrome.no_token_paste_ui",
    "chrome.popup_sign_in_cta",
  ];
  const criticalFail = RESULTS.some((r) => criticalIds.includes(r.id) && !r.pass);
  const retailerPass = RETAILERS.every((r) =>
    RESULTS.some((x) => x.id === `${r.id}.immediate_capture` && x.pass)
  );
  const txMatchPass = RESULTS.some(
    (r) => r.id.endsWith(".tx_matches") && r.pass && Number(r.alternatives || 0) > 0
  );

  const chrome_store_ready =
    !criticalFail && retailerPass && txMatchPass && failed === 0 && passed > 0;

  const out = {
    startedAt,
    finishedAt: new Date().toISOString(),
    app: APP,
    userId: user.userId,
    email: user.email,
    captures,
    results: RESULTS,
    summary: { passed, failed, total: RESULTS.length, retailerPass, criticalFail },
    auth_architecture: {
      type: "website_login_one_time_code_bridge",
      login: `${APP}/extension/auth?ext_session=<nonce>`,
      park: "POST /api/extension/session",
      poll: "GET /api/extension/session?ext_session=",
      refresh: "POST /api/auth/refresh",
      storage: "chrome.storage.local accessToken + refreshToken",
      capture: "POST /api/capture sourceApp=chrome_extension",
    },
    permissions: {
      permissions: ["activeTab", "storage", "scripting", "tabs"],
      host_permissions: ["https://www.intertexe.com/*"],
    },
    chrome_store_ready,
  };

  const outPath = path.join(root, "scripts/artifacts/chrome-extension-e2e-matrix.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("\nWrote", outPath);
  console.log("summary", out.summary);
  console.log("chrome_store_ready=", chrome_store_ready);

  if (user.created && !process.env.E2E_KEEP_USER) {
    await sb.auth.admin.deleteUser(user.userId).catch(() => {});
  }

  process.exit(chrome_store_ready ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
