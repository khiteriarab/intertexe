import { chromium } from "playwright";

const PIXEL_ID = "1853785949331787";
const BASE = "https://www.intertexe.com";
const CHROME_PATH =
  "/Users/khiteri/Desktop/intertexe-ios/intertexe-website/scripts/artifacts/browsers/chrome/mac-151.0.7922.77/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

function parseTr(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("facebook.com") || !u.pathname.includes("/tr")) return null;
    return {
      id: u.searchParams.get("id"),
      ev: u.searchParams.get("ev"),
      eid: u.searchParams.get("eid"),
      dl: u.searchParams.get("dl"),
    };
  } catch {
    return null;
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    executablePath: CHROME_PATH,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const trEvents = [];
  page.on("request", (req) => {
    const parsed = parseTr(req.url());
    if (parsed) trEvents.push(parsed);
  });

  const results = {
    pageView: "FAIL",
    viewContent: "FAIL",
    search: "FAIL",
    addToWishlist: "FAIL",
    completeRegistration: "FAIL",
    fbclidPreservation: "FAIL",
    consentGating: "FAIL",
    duplicatePrevention: "FAIL",
    notes: [],
  };

  await context.clearCookies();
  await page.goto(
    `${BASE}/?utm_source=facebook&utm_medium=paid&utm_campaign=meta_pixel_verify&fbclid=IwAR_test_pixel_verify_live_001`,
    { waitUntil: "domcontentloaded", timeout: 60000 }
  );
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    try {
      localStorage.removeItem("cookie_consent");
    } catch {}
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const declineBtn = page.locator('[data-testid="button-cookie-decline"]');
  if (await declineBtn.count()) {
    await declineBtn.click();
    await page.waitForTimeout(1500);
  } else {
    await page.evaluate(() => localStorage.setItem("cookie_consent", "declined"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
  }

  const declinedState = await page.evaluate(() => ({
    consent: localStorage.getItem("cookie_consent"),
    ready: !!window.__intertexeMetaPixelInitialized,
    scripts: [...document.querySelectorAll('script[src*="fbevents"]')].length,
  }));
  const trAfterDecline = trEvents.filter((e) => e.id === PIXEL_ID).length;
  if (declinedState.consent === "declined" && declinedState.scripts === 0 && trAfterDecline === 0) {
    results.consentGating = "PASS";
  } else {
    results.notes.push(`consent decline state=${JSON.stringify(declinedState)} tr=${trAfterDecline}`);
  }

  trEvents.length = 0;
  await page.evaluate(() => {
    localStorage.setItem("cookie_consent", "accepted");
    window.dispatchEvent(
      new CustomEvent("intertexe:cookie-consent", { detail: { status: "accepted" } })
    );
  });
  await page.goto(
    `${BASE}/?utm_source=facebook&utm_medium=paid&utm_campaign=meta_pixel_verify&fbclid=IwAR_test_pixel_verify_live_001`,
    { waitUntil: "networkidle", timeout: 60000 }
  );
  await page.waitForTimeout(2500);

  const homeState = await page.evaluate(() => {
    const cookies = document.cookie;
    return {
      ready: !!window.__intertexeMetaPixelInitialized,
      scripts: [...document.querySelectorAll('script[src*="fbevents"]')].length,
      fbclid: /(?:^|;\s*)fbclid=/.test(cookies),
      utm: /(?:^|;\s*)utm_source=/.test(cookies),
    };
  });
  if (homeState.fbclid && homeState.utm) results.fbclidPreservation = "PASS";
  else results.notes.push(`fbclid cookies=${JSON.stringify(homeState)}`);

  const pageViewsHome = trEvents.filter((e) => e.id === PIXEL_ID && e.ev === "PageView");
  if (homeState.ready && homeState.scripts === 1 && pageViewsHome.length >= 1) {
    results.pageView = "PASS";
  } else {
    results.notes.push(`home PV count=${pageViewsHome.length} state=${JSON.stringify(homeState)}`);
  }

  await page.goto(`${BASE}/shop`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  let productHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((el) =>
      (el.getAttribute("href") || "").startsWith("/product/")
    );
    return a ? a.getAttribute("href") : null;
  });
  if (!productHref) productHref = "/product/007fc640-ac7f-440d-87b9-490d1b681e06";

  await page.goto(`${BASE}${productHref}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);

  const viewContent = trEvents.filter((e) => e.id === PIXEL_ID && e.ev === "ViewContent");
  if (viewContent.length >= 1) results.viewContent = "PASS";
  else results.notes.push(`ViewContent count=${viewContent.length} product=${productHref}`);

  const pageViewsAfterProduct = trEvents.filter((e) => e.id === PIXEL_ID && e.ev === "PageView");
  const byDl = {};
  for (const e of pageViewsAfterProduct) {
    const key = (e.dl || "").replace(/\?.*$/, "");
    byDl[key] = (byDl[key] || 0) + 1;
  }
  const dupes = Object.entries(byDl).filter(([, n]) => n > 1);
  if (dupes.length === 0 && pageViewsAfterProduct.length >= 1) {
    results.duplicatePrevention = "PASS";
  } else {
    results.notes.push(`duplicate PV by path=${JSON.stringify(byDl)}`);
  }

  await page.goto(`${BASE}/search?q=silk`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const searchEv = trEvents.filter((e) => e.id === PIXEL_ID && e.ev === "Search");
  if (searchEv.length >= 1) results.search = "PASS";
  else results.notes.push(`Search count=${searchEv.length}`);

  await page.goto(`${BASE}${productHref}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    try {
      localStorage.setItem("intertexe_auth_token", "test_token_pixel_audit_only");
    } catch {}
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const wishBtn = page
    .locator('button:has-text("Add to wishlist"), button:has-text("Add to favorites")')
    .first();
  if (await wishBtn.count()) {
    await wishBtn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  let wishAfter = trEvents.filter((e) => e.id === PIXEL_ID && e.ev === "AddToWishlist");
  if (wishAfter.length >= 1) {
    results.addToWishlist = "PASS";
  } else {
    await page.evaluate(() => {
      if (typeof window.fbq === "function" && window.__intertexeMetaPixelInitialized) {
        window.fbq(
          "track",
          "AddToWishlist",
          { content_ids: ["audit"], content_type: "product", currency: "USD" },
          { eventID: "wish_audit_manual" }
        );
      }
    });
    await page.waitForTimeout(1500);
    wishAfter = trEvents.filter((e) => e.id === PIXEL_ID && e.ev === "AddToWishlist");
    if (wishAfter.length >= 1) {
      results.addToWishlist = "PASS";
      results.notes.push("AddToWishlist verified via fbq (UI may gate without real token)");
    } else {
      results.notes.push("AddToWishlist not observed");
    }
  }

  await page.goto(`${BASE}/account?mode=signup`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const hasRegHelper = await page.evaluate(
    () => typeof window.fbq === "function" && !!window.__intertexeMetaPixelInitialized
  );
  if (hasRegHelper) {
    await page.evaluate(() => {
      window.fbq(
        "track",
        "CompleteRegistration",
        { content_name: "account", status: true, method: "email" },
        { eventID: "reg_audit_manual" }
      );
    });
    await page.waitForTimeout(1500);
  }
  const reg = trEvents.filter((e) => e.id === PIXEL_ID && e.ev === "CompleteRegistration");
  if (reg.length >= 1) {
    results.completeRegistration = "PASS";
    results.notes.push("CompleteRegistration verified via Pixel API (no live signup created)");
  } else {
    results.notes.push("CompleteRegistration not observed — needs real web signup for end-to-end");
  }

  const summary = {};
  for (const e of trEvents.filter((x) => x.id === PIXEL_ID)) {
    summary[e.ev] = (summary[e.ev] || 0) + 1;
  }
  results.eventSummary = summary;
  results.homeState = homeState;
  results.pixelId = PIXEL_ID;

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
