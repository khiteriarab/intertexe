const $ = (id) => document.getElementById(id);

const signedOut = $("signedOut");
const signedIn = $("signedIn");
const statusEl = $("status");
const productEl = $("product");
const verdictEl = $("verdict");
const txMatchBtn = $("txMatch");
const processingEl = $("processing");
const winnerEl = $("winner");
const gridEl = $("grid");
const seeAllEl = $("seeAll");
const saveBtn = $("save");
const savedEl = $("saved");
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

function showAuth(signed) {
  signedOut.classList.toggle("hidden", signed);
  signedIn.classList.toggle("hidden", !signed);
}

function formatPrice(price, currency) {
  if (price == null || price === "") return "";
  const n = Number(price);
  if (!Number.isFinite(n)) return "";
  const cur = String(currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${cur} ${Math.round(n)}`;
  }
}

function formatVerdict(raw) {
  const t = String(raw || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const pct = t.match(
    /(\d{1,3}(?:\.\d+)?)\s*%\s*(?:organic\s+|recycled\s+)?(cotton|wool|linen|silk|cashmere|hemp|alpaca|merino|leather)\b/i
  );
  if (pct) return `${pct[1]}% ${pct[2].toUpperCase()}`;
  const fibers = ["silk", "cotton", "linen", "wool", "cashmere", "leather", "hemp"];
  const found = [];
  const lower = t.toLowerCase();
  for (const f of fibers) {
    if (new RegExp(`\\b${f}\\b`).test(lower) && !found.includes(f)) found.push(f);
  }
  if (found.length) return found.slice(0, 2).map((f) => f.toUpperCase()).join(" · ");
  return t.length > 48 ? "" : t.toUpperCase();
}

function usableImage(url) {
  return /^https?:\/\//i.test(String(url || ""));
}

function renderProduct(preview, capture) {
  const src = capture || preview || {};
  const title = src.title || src.productName || "";
  const brand = src.brand_name || src.brandName || src.retailer || "";
  const image = src.image_url || src.imageUrl || "";
  const price = formatPrice(src.price, src.currency);
  if (!title && !image) {
    productEl.classList.add("hidden");
    return;
  }
  productEl.classList.remove("hidden");
  productEl.innerHTML = "";
  const img = document.createElement("img");
  img.alt = "";
  if (usableImage(image)) {
    img.src = image;
    img.addEventListener("error", () => img.remove());
  }
  const meta = document.createElement("div");
  meta.className = "meta";
  if (brand) {
    const b = document.createElement("p");
    b.className = "brand-line";
    b.textContent = brand;
    meta.appendChild(b);
  }
  const h = document.createElement("h2");
  h.textContent = title || "This piece";
  meta.appendChild(h);
  if (price) {
    const p = document.createElement("p");
    p.className = "price";
    p.textContent = price;
    meta.appendChild(p);
  }
  productEl.appendChild(img);
  productEl.appendChild(meta);
}

function renderVerdict(copy, capture, preview) {
  const raw =
    copy?.compositionHeadline ||
    capture?.composition_text ||
    preview?.compositionText ||
    "";
  const line = formatVerdict(raw);
  if (!line) {
    verdictEl.classList.add("hidden");
    return;
  }
  verdictEl.classList.remove("hidden");
  verdictEl.textContent = line;
}

function matchList(capture) {
  const alts = Array.isArray(capture?.alternatives) ? capture.alternatives : [];
  return alts.filter((a) => usableImage(a.image_url));
}

function renderMatches(payload) {
  const capture = payload?.capture || {};
  const links = payload?.links || {};
  const alts = matchList(capture);
  const viewAll = links.viewAllMatchesUrl || payload?.copy?.viewAllMatchesUrl;
  const total = Array.isArray(capture.alternatives) ? capture.alternatives.length : alts.length;

  winnerEl.innerHTML = "";
  gridEl.innerHTML = "";
  seeAllEl.innerHTML = "";

  if (!alts.length) {
    winnerEl.classList.add("hidden");
    gridEl.classList.add("hidden");
    seeAllEl.classList.add("hidden");
    return;
  }

  const winner = alts[0];
  winnerEl.classList.remove("hidden");
  const kicker = document.createElement("p");
  kicker.className = "kicker";
  kicker.textContent = "YOUR TX MATCH";
  const card = document.createElement("a");
  card.className = "card";
  card.href = "#";
  card.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "OPEN_MATCH", alt: winner, captureId: capture.id });
  });
  const img = document.createElement("img");
  img.alt = "";
  img.src = winner.image_url;
  img.addEventListener("error", () => img.remove());
  const meta = document.createElement("div");
  const brand = document.createElement("p");
  brand.className = "brand-line";
  brand.textContent = winner.brand_name || "";
  const name = document.createElement("h3");
  name.textContent = winner.name || "TX Match";
  const why = document.createElement("p");
  why.className = "why";
  why.textContent = winner.why || "Same fabric · Same silhouette · Similar price";
  meta.appendChild(brand);
  meta.appendChild(name);
  meta.appendChild(why);
  card.appendChild(img);
  card.appendChild(meta);
  winnerEl.appendChild(kicker);
  winnerEl.appendChild(card);

  const extras = alts.slice(1, 6);
  if (extras.length) {
    gridEl.classList.remove("hidden");
    for (const alt of extras) {
      const thumb = document.createElement("a");
      thumb.className = "thumb";
      thumb.href = "#";
      thumb.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: "OPEN_MATCH", alt, captureId: capture.id });
      });
      const tImg = document.createElement("img");
      tImg.alt = "";
      tImg.src = alt.image_url;
      tImg.addEventListener("error", () => thumb.remove());
      const cap = document.createElement("span");
      cap.textContent = alt.brand_name || alt.name || "";
      thumb.appendChild(tImg);
      thumb.appendChild(cap);
      gridEl.appendChild(thumb);
    }
  } else {
    gridEl.classList.add("hidden");
  }

  if (viewAll && total > 0) {
    seeAllEl.classList.remove("hidden");
    const a = document.createElement("a");
    a.href = viewAll;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = total > 6 ? `See all ${total} TX Matches` : "See all TX Matches";
    seeAllEl.appendChild(a);
  } else {
    seeAllEl.classList.add("hidden");
  }
}

function setSaved(on) {
  savedEl.classList.toggle("hidden", !on);
  saveBtn.classList.toggle("hidden", on);
}

let peeked = false;

async function refreshUi() {
  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  showAuth(Boolean(state?.signedIn));
  if (state?.status && !/Finding your TX Matches/i.test(state.status)) {
    setStatus(state.status, Boolean(state.error));
  } else {
    setStatus("");
  }
  const preview = state?.preview || null;
  const result = state?.result || null;
  const capture = result?.capture || null;
  renderProduct(preview, capture);
  renderVerdict(result?.copy, capture, preview);
  const processing = Boolean(state?.processing);
  processingEl.classList.toggle("hidden", !processing);
  txMatchBtn.disabled = processing || Boolean(state?.busy);
  saveBtn.disabled = processing || Boolean(state?.busy);
  if (!processing) renderMatches(result);
  const saved = Boolean(capture?.id);
  setSaved(saved);
  if (state?.signedIn && !peeked) {
    peeked = true;
    chrome.runtime.sendMessage({ type: "PEEK_TAB" }).then(refreshUi).catch(() => {});
  }
}

signInBtn.addEventListener("click", async () => {
  setStatus("Opening INTERTEXE sign-in…");
  await chrome.runtime.sendMessage({ type: "SIGN_IN" });
  await refreshUi();
});

signOutBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
  productEl.classList.add("hidden");
  winnerEl.classList.add("hidden");
  gridEl.classList.add("hidden");
  await refreshUi();
});

txMatchBtn.addEventListener("click", async () => {
  txMatchBtn.disabled = true;
  processingEl.classList.remove("hidden");
  setStatus("");
  const res = await chrome.runtime.sendMessage({ type: "TX_MATCH" });
  if (res?.error) setStatus(res.error, true);
  else if (res?.needsSignIn) setStatus("Sign in to finish TX MATCH.");
  txMatchBtn.disabled = false;
  await refreshUi();
});

saveBtn.addEventListener("click", async () => {
  saveBtn.disabled = true;
  const res = await chrome.runtime.sendMessage({ type: "SAVE_INSPIRATION" });
  if (res?.error) setStatus(res.error, true);
  else if (res?.needsSignIn) setStatus("Sign in to save this piece.");
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
