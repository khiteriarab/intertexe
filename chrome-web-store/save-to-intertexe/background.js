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
    "returnTabId",
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
  function fiberCanon(raw) {
    const key = String(raw || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, "");
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
      tencel: "lyocell",
    };
    return canon[key] || key;
  }

  function collectPercentClauses(raw) {
    const t = String(raw || "").replace(/\s+/g, " ");
    if (!t) return [];
    const fiberAlt =
      "cotton|algod[oó]n|algodon|denim|vaquero|wool|lana|linen|lino|silk|seda|cashmere|viscose|viscosa|polyester|poli[eé]ster|polyamide|poliamida|nylon|elastane|elastano|spandex|modal|lyocell|tencel|acrylic|rayon|hemp|alpaca|merino|leather|suede|cupro|triacetate|acetate";
    const seen = new Set();
    const out = [];
    const push = (pctRaw, fiberRaw) => {
      const pct = String(pctRaw || "").replace(",", ".");
      const n = Number(pct);
      if (!Number.isFinite(n) || n <= 0 || n > 100) return;
      const name = fiberCanon(fiberRaw);
      if (!name || seen.has(name)) return;
      seen.add(name);
      out.push(`${n}% ${name.charAt(0).toUpperCase()}${name.slice(1)}`);
    };
    const pctFirst = new RegExp(
      `(\\d{1,3}(?:[.,]\\d+)?)\\s*%\\s*(?:(?:organic|recycled|premium|stretch|pure|extra|fine)\\s+)*(${fiberAlt})`,
      "gi"
    );
    const fiberFirst = new RegExp(
      `\\b(${fiberAlt})\\s*[:\\-–]?\\s*(\\d{1,3}(?:[.,]\\d+)?)\\s*%`,
      "gi"
    );
    const pctFirstHits = [...t.matchAll(pctFirst)];
    const fiberFirstHits = [...t.matchAll(fiberFirst)];
    if (fiberFirstHits.length > pctFirstHits.length) {
      for (const m of fiberFirstHits) push(m[2], m[1]);
    } else {
      for (const m of pctFirstHits) push(m[1], m[2]);
    }
    return out;
  }

  function uniqueFibers(raw) {
    const clauses = collectPercentClauses(raw);
    if (clauses.length) return clauses.join("; ");
    const t = String(raw || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    const re =
      /\b(organic\s+|recycled\s+)?(cotton|algod[oó]n|algodon|denim|vaquero|wool|lana|linen|lino|silk|seda|cashmere|viscose|viscosa|polyester|poli[eé]ster|polyamide|poliamida|nylon|elastane|elastano|spandex|modal|lyocell|tencel|acrylic|rayon|hemp|alpaca|merino|leather|suede|cupro)\b/gi;
    const seen = new Set();
    const out = [];
    let m;
    while ((m = re.exec(t))) {
      const name = fiberCanon(m[2] || "");
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name.charAt(0).toUpperCase() + name.slice(1));
    }
    return out.join("; ");
  }

  function extractConstructionFromHay(raw) {
    const t = String(raw || "").replace(/\s+/g, " ");
    const re =
      /\b((?:eyelash\s+)?lace|trim|silk\s+satin|satin\s+silk|satin|body|shell|outer(?:\s+fabric)?|lining)\s+composition\s*[:\-–]?\s*/gi;
    const hits = [];
    let m;
    while ((m = re.exec(t))) {
      const label = String(m[1] || "").toLowerCase();
      const key = /lace|trim/.test(label) ? "lace" : /lining/.test(label) ? "lining" : "shell";
      hits.push({ key, start: m.index, bodyStart: m.index + m[0].length });
    }
    const laceRe = /\b((?:eyelash\s+)?lace|trim)\s*[:\-–]?\s*(?=\d{1,3}(?:[.,]\d+)?\s*%)/gi;
    while ((m = laceRe.exec(t))) {
      hits.push({ key: "lace", start: m.index, bodyStart: m.index + m[0].length });
    }
    hits.sort((a, b) => a.start - b.start);
    const found = { shell: "", lace: "", lining: "" };
    for (let i = 0; i < hits.length; i++) {
      const stop = i + 1 < hits.length ? hits[i + 1].start : hits[i].bodyStart + 220;
      const clauses = collectPercentClauses(t.slice(hits[i].bodyStart, stop));
      if (clauses.length && !found[hits[i].key]) found[hits[i].key] = clauses.join("; ");
    }
    if (found.shell && (found.lace || found.lining)) {
      const bits = [found.shell];
      if (found.lace) bits.push(`lace: ${found.lace}`);
      if (found.lining) bits.push(`lining: ${found.lining}`);
      return bits.join("; ");
    }
    const listsTrim =
      /\beyelash\s+lace\b/i.test(t) ||
      /\bmaterials?\s*[:\-–]\s*[^.]{0,160}\b(lace|trim)\b/i.test(t) ||
      /\b(lace|trim)\s+composition\b/i.test(t);
    if (!listsTrim) return "";
    const clauses = collectPercentClauses(t);
    const shell = clauses.filter((line) => /^9[8-9](?:\.\d+)?%|^100(?:\.0+)?%/.test(line));
    const rest = clauses.filter((line) => !shell.includes(line));
    if (!shell.length || !rest.length) return "";
    return `${shell.join("; ")}; lace: ${rest.join("; ")}`;
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
  const jsonLdChunks = [];
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
        const extra = node.material || node.pattern || node.composition || "";
        if (Array.isArray(extra)) jsonLdChunks.push(extra.filter(Boolean).map(String).join("; "));
        else if (extra) jsonLdChunks.push(String(extra));
        const props = node.additionalProperty || node.additionalProperties || [];
        for (const prop of Array.isArray(props) ? props : [props]) {
          if (!prop || typeof prop !== "object") continue;
          const pname = String(prop.name || prop.propertyID || "");
          if (!/material|composition|fabric|tejido|composici/i.test(pname)) continue;
          if (typeof prop.value === "string") jsonLdChunks.push(prop.value);
        }
      }
    } catch {
      /* ignore invalid JSON-LD */
    }
  }

  const domChunks = [];
  document
    .querySelectorAll(
      '[itemprop="material"], [class*="composition" i], [id*="composition" i], [data-testid*="composition" i], [class*="material" i], [class*="fabric" i]'
    )
    .forEach((el) => {
      const t = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length > 8 && t.length < 800) domChunks.push(t);
    });

  const bodyText = (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 16000);
  const hay = `${domChunks.join(" \n ")} \n ${jsonLdChunks.join(" \n ")} \n ${bodyText}`;
  const constructed = extractConstructionFromHay(hay);
  if (constructed) {
    compositionText = constructed;
  } else {
    const percentLine = collectPercentClauses(hay);
    if (percentLine.length) {
      compositionText = percentLine.join("; ");
    } else {
      const labeledRe =
        /(?:material|composition|fabric|composici[oó]n|tejido|materiales|made\s+from|made\s+of|outer(?:\s+fabric)?|shell|main\s+fabric)\s*[:\-–]?\s*([^\n]{1,220})/gi;
      let labeled = null;
      let labeledMatch;
      while ((labeledMatch = labeledRe.exec(hay))) {
        const candidate = uniqueFibers(labeledMatch[1] || "");
        if (candidate) {
          labeled = candidate;
          break;
        }
      }
      compositionText = labeled || uniqueFibers(jsonLdChunks.join("; ")) || null;
    }
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

async function pageIsLive(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const html = await res.text();
    if (/Page Not Found|text-not-found-title/i.test(html)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Only return a site URL that actually exists. Never send shoppers to a 404. */
async function liveTxMatchUrl(id, signedIn) {
  if (!id) return "";
  const matches = `${APP}/matches/${encodeURIComponent(id)}`;
  if (await pageIsLive(matches)) return matches;
  if (signedIn) {
    const inspirations = `${APP}/inspirations/${encodeURIComponent(id)}`;
    if (await pageIsLive(inspirations)) return inspirations;
  }
  return "";
}

async function attachLiveLinks(result, signedIn) {
  const id = captureIdOf(result);
  const live = await liveTxMatchUrl(id, signedIn);
  const links = { ...(result?.links || {}) };
  if (live) {
    links.openInIntertexeUrl = live;
    links.viewAllMatchesUrl = live;
  } else {
    links.openInIntertexeUrl = "";
    links.viewAllMatchesUrl = "";
  }
  const view = { ...(result?.view || {}) };
  if (live) view.openInIntertexeUrl = live;
  else view.openInIntertexeUrl = "";
  return { ...result, links, view };
}

function altsFromAnalyze(json) {
  const rows = Array.isArray(json?.alternatives) ? json.alternatives : [];
  return rows.slice(0, 12).map((row, idx) => ({
    id: row.id || String(idx),
    name: row.name || row.title || "TX Match",
    brand_name: row.brand_name || row.brand || "",
    image_url: row.image_url || row.imageUrl || null,
    url: row.url || row.product_url || null,
    price: row.price ?? null,
    currency: row.currency || null,
    composition: row.composition || "",
    natural_fiber_percent: row.natural_fiber_percent ?? null,
  }));
}

function resultFromPayload(payload, alts, extra = {}) {
  const capture = {
    id: extra.id || null,
    title: payload.title || null,
    brand_name: payload.brandName || null,
    retailer: payload.retailer || null,
    image_url: payload.imageUrl || null,
    price: payload.price ?? null,
    currency: payload.currency || null,
    composition_text: payload.compositionText || null,
    original_url: payload.originalUrl || null,
    alternatives: alts,
    source_app: "chrome_extension",
  };
  return {
    capture,
    view: {
      title: payload.title || null,
      alternatives: alts,
      openInIntertexeUrl: extra.liveUrl || "",
    },
    links: {
      openInIntertexeUrl: extra.liveUrl || "",
      viewAllMatchesUrl: extra.liveUrl || "",
    },
    copy: {},
  };
}

async function fallbackAnalyze(payload) {
  const { res, json } = await api("/api/extension/analyze", {
    method: "POST",
    body: {
      composition: payload.compositionText || "",
      product_name: payload.title || "",
      price: payload.price ?? null,
      currency: payload.currency || null,
    },
  });
  if (!res.ok) return resultFromPayload(payload, []);
  return resultFromPayload(payload, altsFromAnalyze(json));
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
  const result = await attachLiveLinks(polled || json, true);
  await chrome.storage.local.set({ lastResult: result, pendingCapture: null });
  return { result };
}

async function createPublicMatches(payload) {
  const { res, json } = await api("/api/matches", {
    method: "POST",
    body: payload,
  });
  if (res.ok && captureIdOf(json)) {
    const polled = await pollPublicCapture(captureIdOf(json));
    const result = await attachLiveLinks(polled || json, false);
    await chrome.storage.local.set({ lastResult: result });
    return { result };
  }
  const result = await fallbackAnalyze(payload);
  await chrome.storage.local.set({ lastResult: result });
  return { result };
}

async function returnToOpenerTab() {
  const store = await getStore();
  const tabId = store.returnTabId;
  await chrome.storage.local.remove(["returnTabId"]);
  if (!tabId) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
    }
    await chrome.tabs.update(tabId, { active: true });
  } catch {
    /* product tab was closed */
  }
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
      await returnToOpenerTab();
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      try {
        if (chrome.action?.openPopup) await chrome.action.openPopup();
      } catch {
        /* some Chrome builds only open the popup from a user gesture */
      }
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
        await setUi("Signed in. You are back on this piece.");
      }
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  await chrome.storage.local.set({ extSession: null, authTabId: null });
  await setUi("Sign-in timed out. Try again.", true);
}

async function startSignIn() {
  const [opener] = await chrome.tabs.query({ active: true, currentWindow: true });
  const extSession = randomNonce();
  const url = `${APP}/extension/auth?ext_session=${encodeURIComponent(extSession)}`;
  const tab = await chrome.tabs.create({ url, active: true });
  await chrome.storage.local.set({
    extSession,
    authTabId: tab.id || null,
    returnTabId: opener?.id && opener.id !== tab.id ? opener.id : null,
  });
  await setUi("Finish signing in — we will bring you back to this piece.");
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
    "returnTabId",
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
    if (msg?.type === "SALE_ALERT") {
      try {
        const store = await getStore();
        const capture = msg.capture || {};
        if (!store.accessToken) {
          if (msg.enabled !== false) await startSignIn();
          sendResponse({ needsSignIn: true });
          return;
        }
        const { res, json } = await authedFetch("/api/sale-alerts", {
          method: "POST",
          body: {
            enabled: msg.enabled !== false,
            source: msg.source || "chrome_extension",
            captureId: capture.id || null,
            category: capture.category || capture.subcategory || null,
            productType: capture.subcategory || capture.category || null,
            brand: capture.brand_name || capture.brandName || null,
            price: capture.price ?? null,
            currency: capture.currency || null,
            materials: capture.composition_text || capture.compositionText || null,
            retailer: capture.retailer || null,
            naturalFiberPercent: capture.natural_fiber_percent ?? null,
          },
        });
        sendResponse({
          ok: res.ok,
          enabled: Boolean(json?.enabled),
          error: res.ok ? null : json?.error || "Could not update the sale alert.",
        });
      } catch (e) {
        sendResponse({ error: e instanceof Error ? e.message : "Could not update the sale alert." });
      }
      return;
    }
    if (msg?.type === "SALE_ALERT_STATUS") {
      try {
        const store = await getStore();
        if (!store.accessToken) {
          sendResponse({ enabled: false });
          return;
        }
        const { res, json } = await authedFetch("/api/sale-alerts");
        sendResponse({ enabled: Boolean(res.ok && json?.enabled) });
      } catch {
        sendResponse({ enabled: false });
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
