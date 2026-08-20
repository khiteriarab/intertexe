const $ = (id) => document.getElementById(id);

const signedOut = $("signedOut");
const signedIn = $("signedIn");
const emptyState = $("emptyState");
const statusEl = $("status");
const sourceEl = $("source");
const resultEl = $("result");
const dockEl = $("dock");
const saveBtn = $("save");
const signInBtn = $("signIn");
const signOutBtn = $("signOut");
const accountBtn = $("accountBtn");
const accountMenu = $("accountMenu");

const SALE_ALERTS_KEY = "itxSaleAlerts";
const PENDING_SALE_KEY = "pendingSaleAlert";
const SORTS = [
  { id: "best", label: "Best" },
  { id: "natural", label: "More natural" },
  { id: "style", label: "Similar style" },
  { id: "price", label: "Similar price" },
  { id: "pure", label: "100% natural" },
];

let matchSort = "best";
let lastPayload = null;
let lastRenderOpts = {};

function setStatus(text, isError) {
  if (!text) {
    statusEl.hidden = true;
    statusEl.textContent = "";
    statusEl.classList.remove("error");
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = text;
  statusEl.classList.toggle("error", Boolean(isError));
}

const ITX = globalThis.ITXCaptureResult || {
  formatCompositionDisplay: (raw) => ({
    materialLine: String(raw || "Material details unavailable"),
    headline: String(raw || "Material details unavailable"),
    hasSyntheticLining: false,
    hasSyntheticLace: false,
  }),
  formatPriceLabel: () => "Price unavailable",
  formatAltPriceLabel: () => ({ label: "Price unavailable", mixed: false }),
  unpublishedMaterialCopy: () => ({
    headline: "Exact composition not published",
    detail: null,
    supporting: null,
    hasSyntheticLining: false,
    hasSyntheticLace: false,
  }),
};

function isEmptyPageCopy(text) {
  return /open a product page/i.test(String(text || ""));
}

function isNoiseStatus(text) {
  return /could not find matches|not signed in/i.test(String(text || ""));
}

const NATURAL_FIBERS = ["silk", "linen", "wool", "cotton", "cashmere", "alpaca", "hemp", "lyocell", "tencel", "cupro"];
const SILHOUETTE_RE =
  /\b(flared?|wide-?leg|straight|bootcut|skinny|slim|cropped|relaxed|oversized|midi|maxi|mini|a-?line|wrap|slip|tailored|babydoll)\b/i;

function popupMaterial(headline) {
  return String(headline || "Exact composition not published")
    .replace(/percentage not provided/gi, "exact percentage not provided")
    .replace(/^\s*Material:\s*/i, "")
    .replace(/;\s*/g, " · ");
}

function editorialLine(raw) {
  return String(raw || "")
    .replace(/^\s*Material:\s*/i, "")
    .replace(/;\s*/g, " · ")
    .replace(/\s*—\s*(exact )?percentage not provided/gi, "")
    .trim();
}

function namedNaturalFibers(text) {
  const named = [];
  const lower = String(text || "").toLowerCase();
  for (const fiber of NATURAL_FIBERS) {
    if (lower.includes(fiber) && !named.includes(fiber)) named.push(fiber === "tencel" ? "lyocell" : fiber);
  }
  return named;
}

function titleCaseFiber(value) {
  return String(value || "").replaceAll(/\b\w/g, (letter) => letter.toUpperCase());
}

function percentBeside(text, fiber) {
  const match = String(text || "").match(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%[^.;%]*(?:${fiber})`, "i")
  );
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function majoritySynthetic(text, share) {
  const hasAvoid = /\b(polyester|nylon|polyamide|acrylic)\b/i.test(text);
  if (!hasAvoid) return false;
  if (share != null) return share < 50;
  const syn = percentBeside(text, "nylon|polyester|polyamide|acrylic");
  const named = namedNaturalFibers(text);
  const nat = named.length ? percentBeside(text, named.join("|")) : null;
  if (syn != null && syn >= 50) return true;
  if (syn != null && nat != null) return syn > nat;
  return false;
}

function localEditorial(listed) {
  const shell = editorialLine(listed?.shellLine || "");
  if (!shell) return "";
  let line = shell;
  if (listed.laceLine) {
    line = `Body ${shell} · trim ${editorialLine(listed.laceLine)}`;
  }
  if (listed.liningLine) {
    line = `${line} · lining ${editorialLine(listed.liningLine)}`;
  }
  return line;
}

function classificationLabel(view, composition, headline, listed) {
  const text = String(composition || headline || "");
  const share = view?.insight?.share;
  const named = namedNaturalFibers(listed?.shellLine || text);
  const hasAvoid = /\b(polyester|nylon|polyamide|acrylic)\b/i.test(listed?.shellLine || text);
  const hasCellulosic = /\b(lyocell|tencel|cupro|modal)\b/i.test(listed?.shellLine || text);
  const hasNatural = named.length > 0;
  const tone = view?.insight?.tone;

  if (listed?.hasSyntheticLace || listed?.laceLine) {
    const shell = named[0] ? titleCaseFiber(named[0]) : "Natural shell";
    if (/\bnylon\b/i.test(listed.laceLine || text)) return `${shell} with nylon lace trim`;
    return `${shell} with synthetic lace trim`;
  }

  if (majoritySynthetic(listed?.shellLine || text, share)) {
    const fiber = named[0] ? titleCaseFiber(named[0]) : "";
    const pct = share != null ? Math.round(share) : named[0] ? percentBeside(text, named[0]) : null;
    if (fiber && pct != null) return `Contains ${fiber} · ${Math.round(pct)}% natural fiber`;
    if (fiber) return `Contains ${fiber}`;
    if (pct != null) return `${Math.round(pct)}% natural fiber`;
    return "Mostly synthetic";
  }

  const fromView = String(view?.classification || "");
  if (fromView && !/nylon lace(?! trim)/i.test(fromView) && !(hasAvoid && /natural-fiber blend/i.test(fromView))) {
    return fromView;
  }

  if (tone === "natural") return named[0] ? titleCaseFiber(named[0]) : "Natural Fiber";
  if (!hasAvoid && (hasCellulosic || (hasNatural && /%/.test(text)))) return "Natural-Fiber Blend";
  if (tone === "mixed") return named[0] && share != null ? `${Math.round(share)}% natural fiber` : "Natural-Fiber Blend";
  if (tone === "synthetic") return "Mostly Synthetic";
  if (hasNatural) return titleCaseFiber(named[0]);
  return "";
}

function whyTag(alt, compositionLine) {
  const reasons = Array.isArray(alt.whyReasons) ? alt.whyReasons : [];
  const composition = String(compositionLine || "").toLowerCase();
  for (const reason of reasons) {
    const text = String(reason || "").trim();
    if (!text) continue;
    const lower = text.toLowerCase();
    if (composition && (lower === composition || composition.includes(lower) || lower.includes(composition))) continue;
    if (/^better material$/i.test(text)) continue;
    return text;
  }
  return "";
}

function parseListedPrice(raw) {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  const n = parseFloat(String(raw || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fabricPriceInsight(opts) {
  const original = parseListedPrice(opts.originalPrice);
  const fiber = String(opts.fiber || "").trim().toLowerCase();
  if (!original || !fiber) return null;
  const cur = String(opts.originalCurrency || "").trim().toUpperCase();
  const prices = (opts.peers || [])
    .map((peer) => {
      if (cur && peer.currency && String(peer.currency).toUpperCase() !== cur) return null;
      return parseListedPrice(peer.price);
    })
    .filter((n) => n != null);
  if (prices.length < 3) return null;
  prices.sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  if (!median) return null;
  const ratio = original / median;
  const fabric = fiber.replace(/^\w/, (c) => c.toUpperCase());
  if (ratio >= 0.82 && ratio <= 1.22) {
    return { tone: "typical", word: "typical", label: `This price is typical for ${fabric}.` };
  }
  if (ratio < 0.82) {
    return { tone: "low", word: "below typical", label: `This price is below typical for ${fabric}.` };
  }
  return { tone: "high", word: "high", label: `This price is high for ${fabric}.` };
}

function sortMatches(items, mode, originalPrice) {
  const copy = items.slice();
  if (mode === "best") return copy;
  if (mode === "pure") {
    return copy.filter((item) => {
      const share = item.naturalFiberPercent ?? item.natural_fiber_percent;
      const composed = String(item.compositionLine || item.composition || "");
      return (typeof share === "number" && share >= 99) || /^100%/.test(composed);
    });
  }
  copy.sort((a, b) => {
    if (mode === "natural") {
      return (b.naturalFiberPercent || b.natural_fiber_percent || 0) - (a.naturalFiberPercent || a.natural_fiber_percent || 0);
    }
    if (mode === "price") {
      const target = originalPrice || 0;
      const pa = parseListedPrice(a.price) ?? parseListedPrice(a.priceLabel) ?? 0;
      const pb = parseListedPrice(b.price) ?? parseListedPrice(b.priceLabel) ?? 0;
      return Math.abs(pa - target) - Math.abs(pb - target);
    }
    const score = (item) => {
      const hay = `${item.name || ""} ${item.why || ""}`.toLowerCase();
      let n = 0;
      if (SILHOUETTE_RE.test(hay)) n += 3;
      if (/\b(jean|denim|trouser|pant|dress|skirt|babydoll|slip)\b/.test(hay)) n += 2;
      if (/similar silhouette|same garment|same category/i.test(String(item.why || ""))) n += 2;
      return n;
    };
    return score(b) - score(a);
  });
  return copy;
}

function restoreSaveBtn() {
  if (saveBtn.parentElement !== signedIn) signedIn.appendChild(saveBtn);
}

function closeAccountMenu() {
  accountMenu.classList.add("hidden");
  accountBtn.setAttribute("aria-expanded", "false");
}

function showAuth(signed, saved, hasProduct) {
  document.body.classList.toggle("is-signed-in", Boolean(signed));
  document.body.classList.toggle("has-product", Boolean(hasProduct));
  document.body.classList.toggle("is-saved", Boolean(saved));

  emptyState.classList.toggle("hidden", Boolean(hasProduct));
  signedOut.classList.toggle("hidden", Boolean(signed));
  signedIn.classList.add("hidden");
  accountBtn.classList.toggle("hidden", !signed);
  if (!signed) closeAccountMenu();

  saveBtn.classList.remove("hidden");

  if (hasProduct) {
    signInBtn.textContent = "Sign in";
    signInBtn.classList.add("quiet-link");
    signInBtn.classList.remove("primary");
  } else {
    signInBtn.textContent = "Sign in";
    signInBtn.classList.add("quiet-link");
    signInBtn.classList.remove("primary");
    restoreSaveBtn();
  }

  if (signed && saved) {
    saveBtn.classList.add("is-saved");
    saveBtn.disabled = true;
    saveBtn.setAttribute("aria-label", "Saved");
  } else {
    saveBtn.classList.remove("is-saved");
    saveBtn.setAttribute("aria-label", "Save this page");
  }
}

function capturePageUrl(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  try {
    const u = new URL(text, "https://www.intertexe.com");
    if (u.pathname === "/open" || u.pathname === "/open/") {
      const next = u.searchParams.get("next") || "";
      if (next.startsWith("/") && !next.startsWith("//")) return `${u.origin}${next}`;
    }
    if (/\/matches\//.test(u.pathname) || /\/inspirations\//.test(u.pathname) || /\/capture\//.test(u.pathname)) {
      return u.href;
    }
    return u.href;
  } catch {
    return text;
  }
}

function saleKey(capture) {
  return String(capture.original_url || capture.originalUrl || "").trim();
}

async function saleAlertsMap() {
  const store = await chrome.storage.local.get(SALE_ALERTS_KEY);
  return store[SALE_ALERTS_KEY] && typeof store[SALE_ALERTS_KEY] === "object" ? store[SALE_ALERTS_KEY] : {};
}

async function isSaleOn(url) {
  if (!url) return false;
  const map = await saleAlertsMap();
  return Boolean(map[url]);
}

async function setSaleAlert(capture, on) {
  const url = saleKey(capture);
  if (!url) return;
  const map = await saleAlertsMap();
  if (on) {
    map[url] = {
      title: capture.title || null,
      price: capture.price ?? null,
      currency: capture.currency || null,
      at: Date.now(),
    };
  } else {
    delete map[url];
  }
  await chrome.storage.local.set({ [SALE_ALERTS_KEY]: map });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function thumb(src) {
  if (src) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = src;
    return img;
  }
  return el("div", "ph");
}

function clearResult() {
  sourceEl.classList.add("hidden");
  sourceEl.innerHTML = "";
  resultEl.classList.add("hidden");
  resultEl.innerHTML = "";
  dockEl.classList.add("hidden");
  dockEl.innerHTML = "";
  document.body.classList.remove("has-matches");
  restoreSaveBtn();
}

function insightRow(insight) {
  if (!insight) return null;
  const p = el("p", "price-insight");
  const idx = insight.label.indexOf(insight.word);
  if (idx < 0) {
    p.textContent = insight.label;
    return p;
  }
  p.appendChild(document.createTextNode(insight.label.slice(0, idx)));
  p.appendChild(el("span", "typical-word", insight.word));
  p.appendChild(document.createTextNode(insight.label.slice(idx + insight.word.length)));
  return p;
}

function renderResult(payload, opts = {}) {
  lastPayload = payload;
  lastRenderOpts = opts;
  sourceEl.classList.remove("hidden");
  sourceEl.innerHTML = "";
  resultEl.classList.add("hidden");
  resultEl.innerHTML = "";
  dockEl.classList.add("hidden");
  dockEl.innerHTML = "";
  if (!payload) {
    clearResult();
    return;
  }

  const capture = payload.capture || {};
  const copy = payload.copy || {};
  const view = payload.view || {};
  const links = payload.links || {};
  const alts = Array.isArray(view.alternatives)
    ? view.alternatives.slice(0, 12)
    : Array.isArray(capture.alternatives)
      ? capture.alternatives.slice(0, 12)
      : [];
  const material = ITX.unpublishedMaterialCopy({
    compositionText: capture.composition_text || "",
    title: view.title || capture.title || "",
    category: String(capture.category || capture.subcategory || ""),
    altCount: alts.length,
  });
  if (
    view.materialHeadline &&
    !/material details unavailable/i.test(String(view.materialHeadline))
  ) {
    material.headline = view.materialHeadline;
    if (view.materialDetail) material.detail = view.materialDetail;
    if (view.materialSupporting) material.supporting = view.materialSupporting;
  }
  const priceLabel = view.priceLabel || ITX.formatPriceLabel(capture.price, capture.currency);
  const brand = String(capture.brand_name || view.brandLine || "")
    .split(" · ")[0]
    .trim();
  const title = view.title || capture.title || capture.brand_name || "This piece";

  const signed = document.body.classList.contains("is-signed-in");
  showAuth(signed, Boolean(signed && capture.id), true);

  const product = el("div", "product");
  const imageWrap = el("div", "product-image");
  imageWrap.appendChild(thumb(capture.image_url || capture.imageUrl));
  product.appendChild(imageWrap);

  const meta = el("div", "product-meta");
  const head = el("div", "product-head");
  const titles = el("div", "product-titles");
  if (brand) titles.appendChild(el("p", "product-brand", brand));
  titles.appendChild(el("h2", "product-title", title));
  head.appendChild(titles);
  const saveSlot = el("div", "product-save");
  saveBtn.classList.remove("hidden");
  saveSlot.appendChild(saveBtn);
  head.appendChild(saveSlot);
  meta.appendChild(head);
  meta.appendChild(el("p", "product-price", priceLabel || "Price unavailable"));

  const listedDisplay = ITX.formatCompositionDisplay(capture.composition_text || "");
  const shellFiber = namedNaturalFibers(listedDisplay.shellLine || capture.composition_text)[0] || "";
  const insight = fabricPriceInsight({
    originalPrice: capture.price,
    originalCurrency: capture.currency,
    fiber: shellFiber,
    peers: alts,
  });
  const insightEl = insightRow(insight);
  if (insightEl) meta.appendChild(insightEl);

  product.appendChild(meta);
  sourceEl.appendChild(product);

  const materialBlock = el("div", "material-block");
  const formula =
    localEditorial(listedDisplay) ||
    editorialLine(listedDisplay.headline) ||
    editorialLine(material.headline);
  const unpublished = /detected|not published|unavailable/i.test(formula || material.headline || "");
  if (formula && !unpublished) {
    materialBlock.appendChild(el("p", "material-formula", formula));
  } else {
    materialBlock.appendChild(el("p", "material-formula", popupMaterial(material.headline)));
    if (material.detail) materialBlock.appendChild(el("p", "material-note", material.detail));
  }
  const klass = classificationLabel(view, capture.composition_text, material.headline, listedDisplay);
  if (klass) materialBlock.appendChild(el("p", "material-class", klass));
  sourceEl.appendChild(materialBlock);

  const trimNote =
    listedDisplay.hasSyntheticLace || listedDisplay.laceLine
      ? "Listed as trim — not mixed into the garment body."
      : view.liningNote ||
        (material.hasSyntheticLace
          ? "Listed as trim — not mixed into the garment body."
          : material.hasSyntheticLining
            ? "Synthetic lining — not the same as a fully natural construction."
            : "");
  if (trimNote) sourceEl.appendChild(el("p", "detail", trimNote));

  const showMatches = Boolean(alts.length && !opts.peek);
  document.body.classList.toggle("has-matches", showMatches);

  const openUrl = capturePageUrl(
    view.openInIntertexeUrl || links.openInIntertexeUrl || copy.openInIntertexeUrl
  );

  const sale = el("div", "sale-row");
  sale.appendChild(el("p", "", "Waiting for a sale?"));
  const alertBtn = el("button", "alert-btn", "Alert me");
  alertBtn.type = "button";
  const urlKey = saleKey(capture);
  isSaleOn(urlKey).then((on) => {
    alertBtn.classList.toggle("is-on", on);
    alertBtn.textContent = on ? "Alert on" : "Alert me";
  });
  const captureId = String(capture.id || "");
  if (signed && captureId) {
    chrome.runtime.sendMessage({ type: "SALE_ALERT_STATUS", captureId }).then((res) => {
      if (!res || typeof res.enabled !== "boolean") return;
      alertBtn.classList.toggle("is-on", res.enabled);
      alertBtn.textContent = res.enabled ? "Alert on" : "Alert me";
    });
  }
  alertBtn.addEventListener("click", async () => {
    const currentlyOn = alertBtn.classList.contains("is-on");
    if (currentlyOn) {
      await setSaleAlert(capture, false);
      if (captureId) {
        await chrome.runtime.sendMessage({ type: "SALE_ALERT", capture, enabled: false });
      }
      alertBtn.classList.remove("is-on");
      alertBtn.textContent = "Alert me";
      setStatus("Sale alert off for this piece.");
      return;
    }
    if (!document.body.classList.contains("is-signed-in")) {
      await chrome.storage.local.set({ [PENDING_SALE_KEY]: urlKey });
      setStatus("Sign in to turn on a sale alert.");
      await chrome.runtime.sendMessage({ type: "SIGN_IN" });
      return;
    }
    saveBtn.disabled = true;
    const res = await chrome.runtime.sendMessage({ type: "SAVE_TAB", force: true });
    saveBtn.disabled = false;
    const savedCapture = res?.result?.capture || capture;
    await setSaleAlert(savedCapture, true);
    const synced = await chrome.runtime.sendMessage({
      type: "SALE_ALERT",
      capture: savedCapture,
      enabled: true,
    });
    alertBtn.classList.add("is-on");
    alertBtn.textContent = "Alert on";
    setStatus(synced?.error || res?.error ? synced?.error || res.error : "We’ll watch this piece for a sale.");
    if (res?.result) renderResult(res.result, lastRenderOpts);
  });
  sale.appendChild(alertBtn);
  sourceEl.appendChild(sale);

  if (showMatches) {
    const action = el("div", "primary-action");
    const cta = el("button", "primary");
    cta.type = "button";
    cta.textContent =
      alts.length === 1 ? "View 1 better-material match" : `View ${alts.length} better-material matches`;
    cta.addEventListener("click", () => {
      resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    action.appendChild(cta);
    if (openUrl) {
      const quiet = el("a", "quiet-page");
      quiet.href = openUrl;
      quiet.target = "_blank";
      quiet.rel = "noreferrer";
      quiet.textContent = "Open on INTERTEXE";
      action.appendChild(quiet);
    }
    sourceEl.appendChild(action);
  }

  if (showMatches) {
    resultEl.classList.remove("hidden");
    const heading = el("div", "alts-head");
    heading.appendChild(el("p", "section-title", "Better-material matches"));
    resultEl.appendChild(heading);

    const bar = el("div", "sort-bar");
    bar.appendChild(el("span", "sort-label", "Sort"));
    for (const item of SORTS) {
      const chip = el("button", `sort-chip${matchSort === item.id ? " is-on" : ""}`, item.label);
      chip.type = "button";
      chip.addEventListener("click", () => {
        matchSort = item.id;
        renderResult(payload, opts);
      });
      bar.appendChild(chip);
    }
    resultEl.appendChild(bar);

    const preview = sortMatches(alts, matchSort, parseListedPrice(capture.price));
    const list = el("div", "alts");
    if (!preview.length) {
      list.appendChild(
        el(
          "p",
          "detail",
          matchSort === "pure"
            ? "No fully natural substitutes in this set. Try More natural, or keep Best."
            : "No substitutes were ready for this sort."
        )
      );
    }
    for (const alt of preview) {
      const card = el("a", "alt");
      card.href = "#";
      card.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: "OPEN_MATCH", alt, captureId: capture.id });
      });
      card.appendChild(thumb(alt.imageUrl || alt.image_url));
      const info = document.createElement("div");
      info.className = "alt-info";
      const altBrand = String(alt.brandName || alt.brand_name || "").trim();
      if (altBrand) info.appendChild(el("span", "alt-brand", altBrand));
      info.appendChild(el("strong", "", alt.name || altBrand || "Better-material match"));
      const priced = alt.priceLabel
        ? { label: alt.priceLabel }
        : ITX.formatAltPriceLabel(alt.price, alt.currency, capture.currency);
      if (priced.label && priced.label !== "Price unavailable") {
        info.appendChild(el("span", "alt-price", priced.label));
      }
      const altListed = ITX.formatCompositionDisplay(alt.composition || "");
      const composed =
        localEditorial(altListed) ||
        alt.compositionLine ||
        editorialLine(altListed.headline || "") ||
        "";
      if (composed && !/unavailable/i.test(composed)) {
        info.appendChild(el("span", "alt-comp", composed));
      }
      const why = whyTag(alt, composed);
      if (why) info.appendChild(el("span", "alt-why", why));
      card.appendChild(info);
      list.appendChild(card);
    }
    resultEl.appendChild(list);
  }

  if ((copy.affiliateDisclosure || view.affiliateDisclosure) && showMatches) {
    resultEl.appendChild(el("p", "disclosure", view.affiliateDisclosure || copy.affiliateDisclosure));
  }
}

function renderPeek(peek) {
  if (!peek) return;
  renderResult(
    {
      capture: {
        title: peek.title,
        brand_name: peek.brandName,
        retailer: peek.retailer,
        image_url: peek.imageUrl,
        price: peek.price,
        currency: peek.currency,
        composition_text: peek.compositionText,
        original_url: peek.originalUrl,
      },
      copy: {},
      links: {},
    },
    { peek: true }
  );
}

async function activatePendingSaleAlert(capture) {
  const store = await chrome.storage.local.get(PENDING_SALE_KEY);
  const pending = String(store[PENDING_SALE_KEY] || "");
  const url = saleKey(capture || {});
  if (!pending || !url || pending !== url) return;
  await setSaleAlert(capture, true);
  await chrome.storage.local.remove(PENDING_SALE_KEY);
  await chrome.runtime.sendMessage({ type: "SALE_ALERT", capture, enabled: true });
}

async function refreshUi() {
  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  const hasSaved = Boolean(state?.result?.capture?.id);
  const hasProduct = Boolean(state?.result || state?.peek);
  showAuth(Boolean(state?.signedIn), hasSaved, hasProduct);
  if (state?.status && !isEmptyPageCopy(state.status) && !isNoiseStatus(state.status)) {
    setStatus(state.status, Boolean(state.error));
  } else setStatus("");
  if (state?.result) {
    if (state.signedIn) await activatePendingSaleAlert(state.result.capture);
    renderResult(state.result);
  } else if (state?.peek) renderPeek(state.peek);
  else clearResult();
  if (!(state?.signedIn && hasSaved)) saveBtn.disabled = Boolean(state?.busy);
  signInBtn.disabled = Boolean(state?.busy);
  return state;
}

async function scanOpenTab() {
  setStatus("Reading this piece…");
  const peeked = await chrome.runtime.sendMessage({ type: "PEEK_TAB" });
  if (peeked?.error) {
    if (isEmptyPageCopy(peeked.error)) {
      setStatus("");
      clearResult();
      const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
      showAuth(Boolean(state?.signedIn), false, false);
    } else {
      setStatus(peeked.error, true);
    }
    return;
  }
  if (peeked?.peek) {
    setStatus("");
    renderPeek(peeked.peek);
  }
  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  saveBtn.disabled = true;
  setStatus("Finding better-material matches…");
  const res = await chrome.runtime.sendMessage({
    type: "SAVE_TAB",
    payload: peeked?.peek,
    quiet: true,
  });
  if (res?.error) {
    if (isEmptyPageCopy(res.error) || isNoiseStatus(res.error)) setStatus("");
    else setStatus(res.error, true);
  } else setStatus("");
  if (res?.result) {
    renderResult(res.result);
    const signed = Boolean((await chrome.runtime.sendMessage({ type: "GET_STATE" }))?.signedIn);
    showAuth(signed, Boolean(signed && res.result?.capture?.id), true);
  }
  if (res?.error) saveBtn.disabled = false;
  else saveBtn.disabled = Boolean(res?.result);
  await refreshUi();
}

signInBtn.addEventListener("click", async () => {
  setStatus("Opening INTERTEXE sign-in…");
  await chrome.runtime.sendMessage({ type: "SIGN_IN" });
  await refreshUi();
});

accountBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = accountMenu.classList.contains("hidden");
  accountMenu.classList.toggle("hidden", !open);
  accountBtn.setAttribute("aria-expanded", String(open));
});

document.addEventListener("click", () => closeAccountMenu());
accountMenu.addEventListener("click", (e) => e.stopPropagation());

signOutBtn.addEventListener("click", async () => {
  closeAccountMenu();
  await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
  clearResult();
  await refreshUi();
});

saveBtn.addEventListener("click", async () => {
  if (saveBtn.classList.contains("is-saved") || saveBtn.disabled) return;
  saveBtn.disabled = true;
  setStatus("Saving…");
  const res = await chrome.runtime.sendMessage({ type: "SAVE_TAB", force: true });
  if (res?.error) setStatus(res.error, true);
  else if (res?.needsSignIn) setStatus("Sign in to finish saving.");
  else setStatus("");
  if (res?.result) renderResult(res.result);
  else if (res?.peek) renderPeek(res.peek);
  saveBtn.disabled = false;
  await refreshUi();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "STATE_CHANGED") refreshUi();
});

refreshUi()
  .then(() => scanOpenTab())
  .catch(() => {
    showAuth(false, false, false);
    setStatus("Could not reach the extension. Close and reopen the popup.", true);
  });
