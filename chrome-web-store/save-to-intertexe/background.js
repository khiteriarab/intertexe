const APP = "https://www.intertexe.com";

function randomNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function getStore() {
  return chrome.storage.local.get([
    "accessToken",
    "refreshToken",
    "pendingCapture",
    "authTabId",
    "extSession",
    "lastResult",
    "uiStatus",
    "uiError",
    "previewProduct",
    "processing",
  ]);
}

function broadcast(patch) {
  chrome.runtime.sendMessage({ type: "STATE_CHANGED", ...patch }).catch(() => {});
}

async function publicState() {
  const store = await getStore();
  return {
    signedIn: Boolean(store.accessToken),
    busy: Boolean(store.extSession),
    result: store.lastResult || null,
    preview: store.previewProduct || null,
    processing: Boolean(store.processing),
    status: store.uiStatus || "",
    error: Boolean(store.uiError),
  };
}

async function setUi(status, error) {
  await chrome.storage.local.set({ uiStatus: status || "", uiError: Boolean(error) });
  broadcast();
}

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${APP}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function refreshTokens(refreshToken) {
  if (!refreshToken) return null;
  const { res, json } = await api("/api/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
  if (!res.ok) return null;
  const accessToken = json.accessToken || json.token;
  if (!accessToken) return null;
  const next = {
    accessToken,
    refreshToken: json.refreshToken || refreshToken,
  };
  await chrome.storage.local.set(next);
  return next;
}

async function authedFetch(path, opts = {}, attempt = 0) {
  const store = await getStore();
  let token = store.accessToken;
  if (!token && store.refreshToken) {
    const refreshed = await refreshTokens(store.refreshToken);
    token = refreshed?.accessToken;
  }
  if (!token) return { res: { status: 401, ok: false }, json: { error: "Not signed in" } };

  const result = await api(path, { ...opts, token });
  if (result.res.status === 401 && attempt === 0 && store.refreshToken) {
    const refreshed = await refreshTokens(store.refreshToken);
    if (refreshed?.accessToken) {
      return authedFetch(path, opts, 1);
    }
    await chrome.storage.local.remove(["accessToken", "refreshToken"]);
  }
  return result;
}

function extractProductFromPage() {
  const attr = (sel) => document.querySelector(sel)?.getAttribute("content")?.trim() || "";
  const text = (sel) => document.querySelector(sel)?.textContent?.trim() || "";
  const ogTitle = attr('meta[property="og:title"]') || attr('meta[name="twitter:title"]');
  const title = ogTitle || text("h1") || document.title || "";
  const imageUrl =
    attr('meta[property="og:image"]') ||
    attr('meta[name="twitter:image"]') ||
    document.querySelector("img[src]")?.src ||
    null;
  const description =
    attr('meta[property="og:description"]') ||
    attr('meta[name="description"]') ||
    null;
  const canonical =
    document.querySelector('link[rel="canonical"]')?.href ||
    attr('meta[property="og:url"]') ||
    location.href;

  let brandName = null;
  let sku = null;
  let price = null;
  let currency = null;
  let compositionText = null;
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent || "null");
      const nodes = Array.isArray(data) ? data : data?.["@graph"] ? data["@graph"] : [data];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const type = String(node["@type"] || "");
        if (!/Product/i.test(type)) continue;
        brandName = brandName || (typeof node.brand === "string" ? node.brand : node.brand?.name) || null;
        sku = sku || node.sku || node.mpn || null;
        const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        if (offer) {
          const raw = offer.price ?? offer.lowPrice;
          if (raw != null && raw !== "") price = Number(raw);
          currency = currency || offer.priceCurrency || null;
        }
        const extra = node.material || node.pattern || "";
        if (extra) compositionText = String(extra);
      }
    } catch {
      /* ignore invalid JSON-LD */
    }
  }

  const bodyText = (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 12000);
  const pct = bodyText.match(
    /(\d{1,3}(?:\.\d+)?%\s*(?:organic\s+|recycled\s+)?(?:cotton|wool|linen|silk|cashmere|hemp|alpaca|merino|leather|suede|cupro))\b/i
  );
  const labeled = bodyText.match(
    /(?:material|composition|fabric|made\s+from|made\s+of)\s*[:\-–]\s*([^.;|\n]{1,80})/i
  );
  if (!compositionText && pct) compositionText = pct[1];
  else if (!compositionText && labeled) compositionText = labeled[1].trim();
  else if (!compositionText) {
    const fiberRe =
      /\b(cotton|wool|linen|silk|cashmere|hemp|alpaca|merino|leather|suede)\b/gi;
    const hits = bodyText.match(fiberRe) || [];
    const unique = [];
    for (const h of hits) {
      const k = h.toLowerCase();
      if (!unique.includes(k)) unique.push(k);
    }
    if (unique.length === 1) compositionText = unique[0];
  }

  let retailer = null;
  try {
    retailer = location.hostname.replace(/^www\./, "");
  } catch {
    retailer = null;
  }

  return {
    originalUrl: canonical || location.href,
    title: title.slice(0, 240),
    imageUrl,
    description: description ? description.slice(0, 500) : null,
    brandName,
    sku,
    price: Number.isFinite(price) ? price : null,
    currency,
    compositionText,
    retailer,
  };
}

async function extractActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  if (!tab.url || !/^https?:/i.test(tab.url)) {
    throw new Error("Open a product page, then tap TX MATCH.");
  }
  const injected = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractProductFromPage,
  });
  const extracted = injected?.[0]?.result;
  if (!extracted?.originalUrl) {
    return {
      originalUrl: tab.url,
      title: tab.title || null,
      imageUrl: null,
      sourceApp: "chrome_extension",
      itemType: "external_product",
      decodeNow: true,
    };
  }
  return {
    ...extracted,
    sourceApp: "chrome_extension",
    itemType: "external_product",
    decodeNow: true,
  };
}

function enrichmentDone(capture) {
  const alts = Array.isArray(capture?.alternatives) ? capture.alternatives.length : 0;
  const status = String(capture?.enrichment_status || "");
  const resolution = String(capture?.resolution_status || "");
  if (alts > 0) return true;
  if (["ready", "skipped", "failed", "needs_information", "enrichment_retry"].includes(status)) {
    return true;
  }
  if (["analyzed", "alternatives_ready", "failed"].includes(resolution)) return true;
  return false;
}

async function pollCapture(id, timeoutMs = 45000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    const { res, json } = await authedFetch(`/api/capture/${id}`);
    if (res.ok) {
      last = json;
      if (enrichmentDone(json.capture || json)) return json;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return last;
}

async function savePayload(payload, { waitForMatches = true } = {}) {
  await chrome.storage.local.set({ processing: Boolean(waitForMatches) });
  if (waitForMatches) await setUi("Finding your TX Matches…");
  const { res, json } = await authedFetch("/api/capture", {
    method: "POST",
    body: payload,
  });
  if (res.status === 401) {
    await chrome.storage.local.set({ processing: false });
    return { needsSignIn: true, payload };
  }
  if (!res.ok || !(json.capture || json).id) {
    await chrome.storage.local.set({ processing: false });
    throw new Error(json.error || json.message || "Could not save this page");
  }
  const captureId = (json.capture || json).id;
  const polled = waitForMatches ? await pollCapture(captureId) : json;
  const result = polled || json;
  await chrome.storage.local.set({
    lastResult: result,
    pendingCapture: null,
    processing: false,
    uiStatus: result?.capture?.id ? "Saved to Inspirations" : "",
  });
  broadcast();
  return { result };
}

async function pollAuthSession(extSession, tabId) {
  const t0 = Date.now();
  while (Date.now() - t0 < 5 * 60 * 1000) {
    const { json } = await api(`/api/extension/session?ext_session=${encodeURIComponent(extSession)}`);
    if (json?.ok && json.accessToken) {
      await chrome.storage.local.set({
        accessToken: json.accessToken,
        refreshToken: json.refreshToken || null,
        extSession: null,
        authTabId: null,
      });
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      const store = await getStore();
      if (store.pendingCapture) {
        await setUi("Finding your TX Matches…");
        try {
          const saved = await savePayload(store.pendingCapture, { waitForMatches: true });
          await setUi(saved.result ? "Saved to Inspirations" : "");
        } catch (e) {
          await setUi(e instanceof Error ? e.message : "Save failed", true);
        }
      } else {
        await setUi("Signed in.");
      }
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  await chrome.storage.local.set({ extSession: null, authTabId: null });
  await setUi("Sign-in timed out. Try again.", true);
}

async function startSignIn() {
  const extSession = randomNonce();
  const url = `${APP}/extension/auth?ext_session=${encodeURIComponent(extSession)}`;
  const tab = await chrome.tabs.create({ url, active: true });
  await chrome.storage.local.set({ extSession, authTabId: tab.id || null });
  await setUi("Finish signing in on the INTERTEXE tab…");
  pollAuthSession(extSession, tab.id).catch((e) =>
    setUi(e instanceof Error ? e.message : "Sign-in failed", true)
  );
}

async function signOut() {
  const store = await getStore();
  if (store.accessToken) {
    await api("/api/auth/logout", {
      method: "POST",
      token: store.accessToken,
      body: { refreshToken: store.refreshToken || null },
    }).catch(() => {});
  }
  await chrome.storage.local.remove([
    "accessToken",
    "refreshToken",
    "pendingCapture",
    "lastResult",
    "previewProduct",
    "processing",
    "extSession",
    "authTabId",
    "uiStatus",
    "uiError",
  ]);
  broadcast();
}

function matchHref(alt) {
  const raw = String(alt?.url || "").trim();
  if (/^https?:/i.test(raw)) return raw;
  if (alt?.id) return `${APP}/product/${encodeURIComponent(alt.id)}`;
  return `${APP}/inspirations`;
}

async function openMatch(alt, captureId) {
  const store = await getStore();
  const productId = String(alt?.id || captureId || "").trim();
  if (store.accessToken && productId) {
    await authedFetch("/api/account/product-clickout", {
      method: "POST",
      body: {
        productId,
        brandName: alt?.brand_name || null,
        productName: alt?.name || null,
        productUrl: alt?.url || matchHref(alt),
        price: alt?.price ?? null,
        currency: alt?.currency || null,
        naturalFiberPercent: alt?.natural_fiber_percent ?? null,
        source: "chrome_extension",
      },
    }).catch(() => {});
  }
  await chrome.tabs.create({ url: matchHref(alt), active: true });
}

async function runCapture({ waitForMatches }) {
  const payload = await extractActiveTab();
  await chrome.storage.local.set({ previewProduct: payload });
  const store = await getStore();
  if (!store.accessToken) {
    await chrome.storage.local.set({ pendingCapture: payload });
    await startSignIn();
    return { needsSignIn: true };
  }
  return savePayload(payload, { waitForMatches });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "GET_STATE") {
      sendResponse(await publicState());
      return;
    }
    if (msg?.type === "SIGN_IN") {
      await startSignIn();
      sendResponse({ ok: true });
      return;
    }
    if (msg?.type === "SIGN_OUT") {
      await signOut();
      sendResponse({ ok: true });
      return;
    }
    if (msg?.type === "PEEK_TAB") {
      try {
        const preview = await extractActiveTab();
        await chrome.storage.local.set({ previewProduct: preview });
        broadcast();
        sendResponse({ preview });
      } catch (e) {
        sendResponse({ error: e instanceof Error ? e.message : "Could not read this page" });
      }
      return;
    }
    if (msg?.type === "TX_MATCH" || msg?.type === "SAVE_TAB") {
      try {
        sendResponse(await runCapture({ waitForMatches: true }));
      } catch (e) {
        const error = e instanceof Error ? e.message : "TX MATCH failed";
        await chrome.storage.local.set({ processing: false });
        await setUi(error, true);
        sendResponse({ error });
      }
      return;
    }
    if (msg?.type === "SAVE_INSPIRATION") {
      try {
        sendResponse(await runCapture({ waitForMatches: false }));
      } catch (e) {
        const error = e instanceof Error ? e.message : "Save failed";
        await setUi(error, true);
        sendResponse({ error });
      }
      return;
    }
    if (msg?.type === "OPEN_MATCH") {
      await openMatch(msg.alt, msg.captureId);
      sendResponse({ ok: true });
    }
  })();
  return true;
});
