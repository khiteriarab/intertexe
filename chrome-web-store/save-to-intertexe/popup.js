const $ = (id) => document.getElementById(id);

const signedOut = $("signedOut");
const signedIn = $("signedIn");
const statusEl = $("status");
const resultEl = $("result");
const saveBtn = $("save");
const signInBtn = $("signIn");
const signOutBtn = $("signOut");

const NATURAL = new Set([
  "cotton",
  "linen",
  "flax",
  "silk",
  "wool",
  "merino",
  "cashmere",
  "hemp",
  "alpaca",
  "mohair",
  "leather",
  "suede",
]);

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

function showAuth(signed) {
  signedOut.classList.toggle("hidden", signed);
  signedIn.classList.toggle("hidden", !signed);
}

function shopLabel(alt) {
  const brand = String(alt.brand_name || "").trim();
  return brand ? `Shop at ${brand}` : "Shop";
}

function formatPrice(price, currency) {
  const num = typeof price === "string" ? parseFloat(price) : Number(price);
  if (!Number.isFinite(num)) return "";
  const cur = String(currency || "").trim().toUpperCase();
  try {
    return new Intl.NumberFormat(cur === "EUR" ? "en-IE" : cur === "GBP" ? "en-GB" : "en-US", {
      style: cur ? "currency" : "decimal",
      currency: cur || "USD",
      maximumFractionDigits: num % 1 === 0 ? 0 : 2,
    }).format(num);
  } catch {
    return String(num);
  }
}

function naturalShare(text) {
  const raw = String(text || "");
  const hits = [...raw.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%\s*([a-z][a-z\s-]{1,30})/gi)];
  if (!hits.length) return null;
  let natural = 0;
  let total = 0;
  for (const m of hits) {
    const pct = Number(m[1]);
    if (!Number.isFinite(pct)) continue;
    total += pct;
    const fiber = String(m[2] || "")
      .toLowerCase()
      .replace(/[^a-z]+/g, " ")
      .trim()
      .split(" ")[0];
    if (NATURAL.has(fiber)) natural += pct;
  }
  if (!total) return null;
  return Math.round(natural);
}

function insightFromText(text, headline) {
  const share = naturalShare(text || headline);
  if (share == null) {
    return { share: null, tone: "unknown", label: headline || "Material details unavailable" };
  }
  if (share >= 80) return { share, tone: "natural", label: "This mix is mostly natural" };
  if (share >= 50) return { share, tone: "mixed", label: "Natural fiber is typical here" };
  return { share, tone: "synthetic", label: "This mix is mostly synthetic" };
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

function renderResult(payload) {
  resultEl.classList.remove("hidden");
  resultEl.innerHTML = "";
  if (!payload) return;

  const capture = payload.capture || {};
  const copy = payload.copy || {};
  const links = payload.links || {};
  const alts = Array.isArray(capture.alternatives) ? capture.alternatives.slice(0, 3) : [];
  const composition = copy.compositionHeadline || capture.composition_text || "";
  const insight = insightFromText(composition, copy.compositionHeadline);

  const toast = el("div", "toast");
  toast.appendChild(thumb(capture.image_url));
  toast.appendChild(
    el("span", "", payload.duplicate ? "Already in Inspirations" : "Saved to Inspirations")
  );
  resultEl.appendChild(toast);

  const product = el("div", "product");
  product.appendChild(thumb(capture.image_url));
  const meta = document.createElement("div");
  meta.appendChild(el("strong", "", capture.title || capture.brand_name || "Saved piece"));
  const bits = [capture.brand_name, capture.retailer, formatPrice(capture.price, capture.currency)].filter(Boolean);
  if (bits.length) meta.appendChild(el("span", "", bits.join(" · ")));
  product.appendChild(meta);
  resultEl.appendChild(product);

  const insightBox = el("div", "insight");
  insightBox.appendChild(el("p", `label ${insight.tone}`, insight.label));
  if (insight.share != null) {
    const bar = el("div", "bar");
    const dot = el("div", "dot");
    dot.style.left = `${Math.max(4, Math.min(96, insight.share))}%`;
    bar.appendChild(dot);
    insightBox.appendChild(bar);
  }
  if (copy.compositionDetail || composition) {
    insightBox.appendChild(el("p", "detail", copy.compositionDetail || composition));
  }
  resultEl.appendChild(insightBox);

  if (alts.length) {
    resultEl.appendChild(el("p", "section-title", copy.alternativesTitle || "Top matches"));
    for (const alt of alts) {
      const card = el("a", "alt");
      card.href = "#";
      card.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: "OPEN_MATCH", alt, captureId: capture.id });
      });
      const img = thumb(alt.image_url);
      img.className = img.className || "";
      card.appendChild(img);
      const info = document.createElement("div");
      info.appendChild(el("strong", "", alt.name || alt.brand_name || "TX Match"));
      info.appendChild(el("span", "", alt.composition || alt.why || shopLabel(alt)));
      card.appendChild(info);
      const badge = el("div", "badge");
      const price = formatPrice(alt.price, alt.currency);
      if (price) badge.appendChild(el("span", "price", price));
      const orig = Number(capture.price);
      const next = Number(alt.price);
      const sameCurrency =
        capture.currency && alt.currency && String(capture.currency).toUpperCase() === String(alt.currency).toUpperCase();
      if (sameCurrency && orig > 0 && next < orig) {
        badge.appendChild(el("span", "save", `${Math.round(((orig - next) / orig) * 100)}% less`));
      } else if (
        alt.natural_fiber_percent != null &&
        insight.share != null &&
        Number(alt.natural_fiber_percent) > insight.share
      ) {
        badge.appendChild(el("span", "save", "more natural"));
      }
      card.appendChild(badge);
      resultEl.appendChild(card);
    }
  }

  const actions = el("div", "actions");
  const openUrl = links.openInIntertexeUrl || copy.openInIntertexeUrl;
  if (openUrl) {
    const a = el("a", "primary");
    a.href = openUrl;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = "Open in INTERTEXE";
    actions.appendChild(a);
  }
  const matchesUrl = links.viewAllMatchesUrl || copy.viewAllMatchesUrl;
  if (copy.decodeAction && matchesUrl) {
    const a = el("a", "secondary");
    a.href = matchesUrl;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = copy.decodeAction;
    actions.appendChild(a);
  }
  resultEl.appendChild(actions);

  if (copy.affiliateDisclosure) {
    resultEl.appendChild(el("p", "disclosure", copy.affiliateDisclosure));
  }
}

async function refreshUi() {
  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  showAuth(Boolean(state?.signedIn));
  if (state?.status) setStatus(state.status, Boolean(state.error));
  else setStatus("");
  if (state?.result) renderResult(state.result);
  saveBtn.disabled = Boolean(state?.busy);
  signInBtn.disabled = Boolean(state?.busy);
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
  await refreshUi();
});

saveBtn.addEventListener("click", async () => {
  saveBtn.disabled = true;
  setStatus("Saving…");
  const res = await chrome.runtime.sendMessage({ type: "SAVE_TAB" });
  if (res?.error) setStatus(res.error, true);
  else if (res?.needsSignIn) setStatus("Sign in to finish saving.");
  else setStatus("");
  if (res?.result) renderResult(res.result);
  saveBtn.disabled = false;
  await refreshUi();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "STATE_CHANGED") refreshUi();
});

refreshUi().catch(() => {
  showAuth(false);
  setStatus("Could not reach the extension. Close and reopen the popup.", true);
});
