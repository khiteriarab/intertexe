const $ = (id) => document.getElementById(id);

const signedOut = $("signedOut");
const signedIn = $("signedIn");
const statusEl = $("status");
const resultEl = $("result");
const dockEl = $("dock");
const saveBtn = $("save");
const signInBtn = $("signIn");
const signOutBtn = $("signOut");

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

function showAuth(signed, saved) {
  signedOut.classList.toggle("hidden", signed);
  signedIn.classList.toggle("hidden", !signed);
  signOutBtn.classList.toggle("hidden", !signed);
  if (signed && saved) {
    saveBtn.textContent = "Saved ✓";
    saveBtn.disabled = true;
  } else {
    saveBtn.textContent = "Save this page";
  }
}

function shopLabel(alt) {
  const brand = String(alt.brand_name || "").trim();
  return brand ? `Shop at ${brand}` : "Shop";
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

function renderResult(payload, opts = {}) {
  resultEl.classList.remove("hidden");
  resultEl.innerHTML = "";
  dockEl.classList.add("hidden");
  dockEl.innerHTML = "";
  if (!payload) return;

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
  const brandBits = [capture.brand_name, capture.retailer].filter(Boolean);
  const metaLine = [...brandBits, priceLabel].filter(Boolean).join(" · ");

  if (opts.peek) {
    const toast = el("div", "toast");
    toast.appendChild(thumb(capture.image_url));
    toast.appendChild(
      el(
        "span",
        "",
        material.headline === "Material details unavailable" ? "Looking for material…" : "Material from this page"
      )
    );
    resultEl.appendChild(toast);
  }

  const product = el("div", "product");
  product.appendChild(thumb(capture.image_url));
  const meta = document.createElement("div");
  meta.appendChild(el("strong", "", view.title || capture.title || capture.brand_name || "This piece"));
  if (metaLine) meta.appendChild(el("span", "", metaLine));
  meta.appendChild(el("span", "", material.materialLine));
  product.appendChild(meta);
  resultEl.appendChild(product);

  if (material.hasSyntheticLining || view.liningNote) {
    resultEl.appendChild(
      el("p", "detail", view.liningNote || "Synthetic lining — not the same as a fully natural construction.")
    );
  }

  if (alts.length) {
    resultEl.appendChild(
      el("p", "section-title", view.alternativesTitle || copy.alternativesTitle || `${alts.length} better-material matches`)
    );
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
      info.appendChild(el("strong", "", alt.name || alt.brandName || alt.brand_name || "TX Match"));
      const composed =
        alt.compositionLine ||
        ITX.formatCompositionDisplay(alt.composition || "").headline ||
        alt.why ||
        shopLabel(alt);
      info.appendChild(el("span", "", composed === "Material details unavailable" ? shopLabel(alt) : composed));
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

  const openUrl = view.openInIntertexeUrl || links.openInIntertexeUrl || copy.openInIntertexeUrl;
  if (openUrl) {
    const a = el("a", "primary");
    a.href = openUrl;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = "Open in INTERTEXE";
    dockEl.appendChild(a);
    dockEl.classList.remove("hidden");
  }

  if (copy.affiliateDisclosure || view.affiliateDisclosure) {
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
  showAuth(Boolean(state?.signedIn), hasSaved);
  if (state?.status) setStatus(state.status, Boolean(state.error));
  else setStatus("");
  if (state?.result) renderResult(state.result);
  else if (state?.peek) renderPeek(state.peek);
  if (!(state?.signedIn && hasSaved)) saveBtn.disabled = Boolean(state?.busy);
  signInBtn.disabled = Boolean(state?.busy);
  return state;
}

async function scanOpenTab() {
  setStatus("Reading material…");
  const peeked = await chrome.runtime.sendMessage({ type: "PEEK_TAB" });
  if (peeked?.error) {
    setStatus(peeked.error, true);
    return;
  }
  if (peeked?.peek) {
    setStatus("");
    renderPeek(peeked.peek);
  }
  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  if (!state?.signedIn) {
    showAuth(false, Boolean(peeked?.peek));
    return;
  }
  saveBtn.disabled = true;
  setStatus("Finding TX Matches…");
  const res = await chrome.runtime.sendMessage({
    type: "SAVE_TAB",
    payload: peeked?.peek,
    quiet: true,
  });
  if (res?.error) setStatus(res.error, true);
  else setStatus("");
  if (res?.result) {
    renderResult(res.result);
    saveBtn.textContent = "Saved ✓";
    saveBtn.disabled = true;
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

signOutBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
  resultEl.classList.add("hidden");
  resultEl.innerHTML = "";
  dockEl.classList.add("hidden");
  dockEl.innerHTML = "";
  await refreshUi();
});

saveBtn.addEventListener("click", async () => {
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
    showAuth(false, false);
    setStatus("Could not reach the extension. Close and reopen the popup.", true);
  });
