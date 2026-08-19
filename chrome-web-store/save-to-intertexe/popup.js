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
  }),
  formatPriceLabel: () => "Price unavailable",
  formatAltPriceLabel: () => ({ label: "Price unavailable", mixed: false }),
};

function isEmptyPageCopy(text) {
  return /open a product page/i.test(String(text || ""));
}

function popupMaterial(headline) {
  return String(headline || "Material details unavailable").replace(
    /percentage not provided/gi,
    "exact percentage not provided"
  );
}

function constructionVerdict(view, headline) {
  const tone = view?.insight?.tone;
  if (tone === "natural") return "Natural-fiber construction";
  if (tone === "mixed") return "Mixed-fiber construction";
  if (tone === "synthetic") return "Mostly synthetic construction";
  const t = String(headline || "").toLowerCase();
  const hasNatural = /(silk|cotton|wool|linen|cashmere|hemp|alpaca|leather|suede|merino)/.test(t);
  const hasSynthetic = /(polyester|polyamide|nylon|elastane|acrylic|rayon|acetate|viscose)/.test(t);
  if (hasNatural && hasSynthetic) return "Mixed-fiber construction";
  if (hasNatural) return "Natural-fiber construction";
  if (hasSynthetic) return "Mostly synthetic construction";
  return "";
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

  saveBtn.classList.toggle("hidden", !signed);

  if (hasProduct) {
    signInBtn.textContent = "Sign in to save and see TX Matches";
    signInBtn.classList.remove("quiet-link");
    signInBtn.classList.add("primary");
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
      if (next.startsWith("/capture/")) return `${u.origin}${next}`;
    }
    return u.href;
  } catch {
    return text;
  }
}

function shopLabel(alt) {
  const brand = String(alt.brandName || alt.brand_name || "").trim();
  return brand ? `Shop at ${brand}` : "Shop";
}

function retailerLabel(alt) {
  const brand = String(alt.brandName || alt.brand_name || "").trim();
  if (alt.retailer) return String(alt.retailer).trim();
  try {
    const host = new URL(String(alt.url || "")).hostname.replace(/^www\./, "");
    if (host && host.toLowerCase() !== brand.toLowerCase()) return host;
  } catch {
    /* keep brand-only */
  }
  return "";
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

function renderResult(payload, opts = {}) {
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
    ? view.alternatives
    : Array.isArray(capture.alternatives)
      ? capture.alternatives.slice(0, 12)
      : [];
  const material = ITX.formatCompositionDisplay(
    view.materialHeadline || copy.compositionHeadline || capture.composition_text || ""
  );
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
  if (document.body.classList.contains("is-signed-in")) {
    const saveSlot = el("div", "product-save");
    saveBtn.classList.remove("hidden");
    saveSlot.appendChild(saveBtn);
    head.appendChild(saveSlot);
  } else {
    restoreSaveBtn();
  }
  meta.appendChild(head);
  meta.appendChild(el("p", "product-price", priceLabel || "Price unavailable"));
  product.appendChild(meta);
  sourceEl.appendChild(product);

  const materialBlock = el("div", "material-block");
  materialBlock.appendChild(el("p", "material-result", popupMaterial(material.headline)));
  const verdict = constructionVerdict(view, material.headline);
  if (verdict) materialBlock.appendChild(el("p", "material-verdict", verdict));
  sourceEl.appendChild(materialBlock);

  if (material.hasSyntheticLining || view.liningNote) {
    sourceEl.appendChild(
      el("p", "detail", view.liningNote || "Synthetic lining — not the same as a fully natural construction.")
    );
  }

  const showMatches = Boolean(alts.length && !opts.peek);
  document.body.classList.toggle("has-matches", showMatches);

  const openUrl = capturePageUrl(
    view.openInIntertexeUrl || links.openInIntertexeUrl || copy.openInIntertexeUrl
  );
  if (openUrl && showMatches) {
    const a = el("a", "primary");
    a.href = openUrl;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = `See ${alts.length} better-material matches`;
    const action = el("div", "primary-action");
    action.appendChild(a);
    sourceEl.appendChild(action);
  }

  if (showMatches) {
    resultEl.classList.remove("hidden");
    resultEl.appendChild(el("p", "section-title", "Better-material matches"));
    const list = el("div", "alts");
    for (const alt of alts) {
      const card = el("a", "alt");
      card.href = "#";
      card.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: "OPEN_MATCH", alt, captureId: capture.id });
      });
      card.appendChild(thumb(alt.imageUrl || alt.image_url));
      const info = document.createElement("div");
      const altBrand = String(alt.brandName || alt.brand_name || "").trim();
      if (altBrand) info.appendChild(el("span", "alt-brand", altBrand));
      info.appendChild(el("strong", "", alt.name || altBrand || "TX Match"));
      const composed =
        alt.compositionLine ||
        ITX.formatCompositionDisplay(alt.composition || "").headline ||
        "";
      if (composed && composed !== "Material details unavailable") {
        info.appendChild(el("span", "alt-comp", popupMaterial(composed)));
      }
      const shop = retailerLabel(alt);
      if (shop && shop.toLowerCase() !== altBrand.toLowerCase()) {
        info.appendChild(el("span", "alt-retailer", shop));
      } else if (!composed) {
        info.appendChild(el("span", "alt-comp", shopLabel(alt)));
      }
      card.appendChild(info);
      const badge = el("div", "badge");
      const priced = alt.priceLabel
        ? { label: alt.priceLabel, mixed: Boolean(alt.mixedCurrency) }
        : ITX.formatAltPriceLabel(alt.price, alt.currency, capture.currency);
      if (priced.label) badge.appendChild(el("span", "price", priced.label));
      if (priced.mixed) badge.appendChild(el("span", "save", "mixed currency"));
      card.appendChild(badge);
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
      },
      copy: {},
      links: {},
    },
    { peek: true }
  );
}

async function refreshUi() {
  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  const hasSaved = Boolean(state?.result?.capture?.id);
  const hasProduct = Boolean(state?.result || state?.peek);
  showAuth(Boolean(state?.signedIn), hasSaved, hasProduct);
  if (state?.status && !isEmptyPageCopy(state.status)) setStatus(state.status, Boolean(state.error));
  else setStatus("");
  if (state?.result) renderResult(state.result);
  else if (state?.peek) renderPeek(state.peek);
  else clearResult();
  if (!(state?.signedIn && hasSaved)) saveBtn.disabled = Boolean(state?.busy);
  signInBtn.disabled = Boolean(state?.busy);
  return state;
}

async function scanOpenTab() {
  setStatus("Reading material…");
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
  if (!state?.signedIn) {
    showAuth(false, false, Boolean(peeked?.peek));
    return;
  }
  saveBtn.disabled = true;
  setStatus("Finding TX Matches…");
  const res = await chrome.runtime.sendMessage({
    type: "SAVE_TAB",
    payload: peeked?.peek,
    quiet: true,
  });
  if (res?.error) {
    if (isEmptyPageCopy(res.error)) setStatus("");
    else setStatus(res.error, true);
  } else setStatus("");
  if (res?.result) {
    renderResult(res.result);
    showAuth(true, Boolean(res.result?.capture?.id), true);
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
