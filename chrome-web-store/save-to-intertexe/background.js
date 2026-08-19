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
    "lastPeek",
    "uiStatus",
    "uiError",
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
    peek: store.lastPeek || null,
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
  function uniqueFibers(raw) {
    const t = String(raw || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    const re =
      /\b(organic\s+|recycled\s+)?(cotton|algod[oó]n|algodon|denim|vaquero|wool|lana|linen|lino|silk|seda|cashmere|viscose|viscosa|polyester|poli[eé]ster|polyamide|poliamida|nylon|elastane|elastano|spandex|modal|lyocell|tencel|acrylic|rayon|hemp|alpaca|merino|leather|suede|cupro)\b/gi;
    const seen = new Set();
    const out = [];
    const canon = {
      algodon: "cotton",
      denim: "cotton",
      vaquero: "cotton",
      seda: "silk",
      lana: "wool",
      lino: "linen",
      elastano: "elastane",
      viscosa: "viscose",
      poliester: "polyester",
      poliamida: "polyamide",
      spandex: "elastane",
    };
    let m;
    while ((m = re.exec(t))) {
      const rawName = String(m[2] || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const name = canon[rawName] || rawName;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name.charAt(0).toUpperCase() + name.slice(1));
    }
    const percents = [
      ...t.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:organic\s+|recycled\s+)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s-]{1,30})/gi),
    ];
    if (percents.length) {
      const seenPct = new Set();
      const clauses = [];
      for (const hit of percents) {
        const rawFiber = String(hit[2] || "").trim();
        const key = rawFiber.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
        const name = canon[key] || key;
        if (!name || seenPct.has(name)) continue;
        seenPct.add(name);
        clauses.push(`${hit[1]}% ${name.charAt(0).toUpperCase()}${name.slice(1)}`);
      }
      return clauses.join("; ");
    }
    return out.join("; ");
  }

  function visibleOffer(text) {
    const found = [];
    const re =
      /(?:(€|£|\$|EUR|GBP|USD)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?))|(?:(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)\s*(€|EUR))/gi;
    let m;
    while ((m = re.exec(text))) {
      const symbol = m[1] || m[4] || "";
      const amountRaw = String(m[2] || m[3] || "").replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
      const price = parseFloat(amountRaw);
      let currency = null;
      const s = symbol.toUpperCase();
      if (s === "€" || s === "EUR") currency = "EUR";
      else if (s === "£" || s === "GBP") currency = "GBP";
      else if (s === "$" || s === "USD") currency = "USD";
      if (currency && Number.isFinite(price) && price >= 10 && price <= 50000) {
        found.push({ price, currency });
      }
    }
    if (!found.length) return { price: null, currency: null };
    const rank = { EUR: 3, GBP: 3, USD: 1 };
    found.sort((a, b) => (rank[b.currency] || 0) - (rank[a.currency] || 0));
    return found[0];
  }

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
          const n = Number(raw);
          if (Number.isFinite(n) && n > 0) price = n;
          currency = currency || offer.priceCurrency || null;
        }
        const extra = node.material || node.pattern || "";
        if (Array.isArray(extra)) {
          compositionText = extra.filter(Boolean).map(String).join("; ");
        } else if (extra) {
          compositionText = String(extra);
        }
      }
    } catch {
      /* ignore invalid JSON-LD */
    }
  }

  const bodyText = (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 12000);
  const labeledRe =
    /(?:material|composition|fabric|composici[oó]n|tejido|materiales|made\s+from|made\s+of|outer(?:\s+fabric)?|shell|main\s+fabric)\s*[:\-–]\s*([^.;|\n]{1,80})/gi;
  let labeled = null;
  let labeledMatch;
  while ((labeledMatch = labeledRe.exec(bodyText))) {
    const candidate = uniqueFibers(labeledMatch[1] || "");
    if (candidate) {
      labeled = candidate;
      break;
    }
  }
  if (labeled) compositionText = labeled;
  else if (compositionText) compositionText = uniqueFibers(compositionText) || compositionText;
  else {
    const pctLine = bodyText.match(
      /\d{1,3}(?:\.\d+)?%\s*(?:organic\s+|recycled\s+)?(?:cotton|algod[oó]n|algodon|denim|vaquero|wool|lana|linen|lino|silk|seda|cashmere|viscose|viscosa|polyester|poli[eé]ster|polyamide|poliamida|nylon|elastane|elastano|spandex|modal|lyocell|tencel|acrylic|rayon|hemp|alpaca|merino|leather|suede|cupro)(?:\s*[;,/]\s*\d{1,3}(?:\.\d+)?%\s*(?:organic\s+|recycled\s+)?(?:cotton|algod[oó]n|algodon|denim|vaquero|wool|lana|linen|lino|silk|seda|cashmere|viscose|viscosa|polyester|poli[eé]ster|polyamide|poliamida|nylon|elastane|elastano|spandex|modal|lyocell|tencel|acrylic|rayon|hemp|alpaca|merino|leather|suede|cupro)){0,6}/i
    );
    compositionText = pctLine ? uniqueFibers(pctLine[0]) : null;
  }

  const visible = visibleOffer(bodyText);
  if ((!price || price <= 0) && visible.price) {
    price = visible.price;
    currency = visible.currency || currency;
  } else if (price > 0 && visible.price && visible.currency && currency && visible.currency !== currency) {
    const rank = { EUR: 3, GBP: 3, USD: 1 };
    if ((rank[visible.currency] || 0) >= (rank[String(currency).toUpperCase()] || 0)) {
      price = visible.price;
      currency = visible.currency;
    }
  }
  // Visible page text is read locally to find a composition line. It is not
  // transmitted as a raw page dump — only the short compositionText above.

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
    price: Number.isFinite(price) && price > 0 ? price : null,
    currency,
    compositionText,
    retailer,
  };
}

async function extractActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  if (!tab.url || !/^https?:/i.test(tab.url)) {
    throw new Error("Open a product page, then save.");
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

function captureIdOf(json) {
  return (json?.capture || json)?.id || null;
}

function priorCaptureUrl(result) {
  const prior = result?.capture || result || {};
  return String(prior.original_url || prior.originalUrl || "");
}

async function pollCapture(id, timeoutMs = 25000) {
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

async function pollPublicCapture(id, timeoutMs = 25000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    const { res, json } = await api(`/api/matches/${id}`);
    if (res.ok) {
      last = json;
      if (enrichmentDone(json.capture || json)) return json;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return last;
}

async function savePayload(payload) {
  const { res, json } = await authedFetch("/api/capture", {
    method: "POST",
    body: payload,
  });
  if (res.status === 401) {
    return { needsSignIn: true, payload };
  }
  if (!res.ok || !captureIdOf(json)) {
    throw new Error(json.error || json.message || "Could not save this page");
  }
  const polled = await pollCapture(captureIdOf(json));
  const result = polled || json;
  await chrome.storage.local.set({ lastResult: result, pendingCapture: null });
  return { result };
}

async function createPublicMatches(payload) {
  const { res, json } = await api("/api/matches", {
    method: "POST",
    body: payload,
  });
  if (!res.ok || !captureIdOf(json)) {
    throw new Error(json.error || json.message || "Could not find matches");
  }
  const polled = await pollPublicCapture(captureIdOf(json));
  const result = polled || json;
  await chrome.storage.local.set({ lastResult: result });
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
        await setUi("Signed in — saving…");
        try {
          const saved = await savePayload(store.pendingCapture);
          await setUi(saved.result ? "Saved to Inspirations." : "");
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
    "lastPeek",
    "extSession",
    "authTabId",
    "uiStatus",
    "uiError",
  ]);
  broadcast();
}

function matchHref(alt) {
  const raw = String(alt?.url || "").trim();
  if (/^https?:/i.test(raw)) {
    const brand = encodeURIComponent(alt?.brand_name || alt?.brandName || "partner");
    return `${APP}/leaving?brand=${brand}&url=${encodeURIComponent(raw)}`;
  }
  if (alt?.id) return `${APP}/product/${encodeURIComponent(alt.id)}`;
  return `${APP}/capture`;
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
        const peek = await extractActiveTab();
        await chrome.storage.local.set({ lastPeek: peek, uiStatus: "", uiError: false });
        sendResponse({ peek });
      } catch (e) {
        const error = e instanceof Error ? e.message : "Could not read this page";
        await setUi(error, true);
        sendResponse({ error });
      }
      return;
    }
    if (msg?.type === "SAVE_TAB") {
      try {
        const payload = msg.payload || (await extractActiveTab());
        const store = await getStore();
        const currentUrl = String(payload.originalUrl || "");
        const priorUrl = priorCaptureUrl(store.lastResult);
        const priorAlts = store.lastResult?.capture?.alternatives || store.lastResult?.view?.alternatives;
        if (
          !msg.force &&
          currentUrl &&
          priorUrl &&
          currentUrl === priorUrl &&
          Array.isArray(priorAlts) &&
          priorAlts.length
        ) {
          sendResponse({ result: store.lastResult, peek: payload, reused: true });
          return;
        }
        if (!store.accessToken) {
          if (msg.force) {
            await chrome.storage.local.set({ pendingCapture: payload, lastPeek: payload });
            await startSignIn();
            sendResponse({ needsSignIn: true, peek: payload });
            return;
          }
          const created = await createPublicMatches(payload);
          await chrome.storage.local.set({ lastPeek: payload });
          sendResponse({ ...created, peek: payload });
          return;
        }
        const saved = await savePayload(payload);
        sendResponse({ ...saved, peek: payload });
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
