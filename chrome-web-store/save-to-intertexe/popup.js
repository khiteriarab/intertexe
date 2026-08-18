const $ = (id) => document.getElementById(id);

const signedOut = $("signedOut");
const signedIn = $("signedIn");
const statusEl = $("status");
const resultEl = $("result");
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

function showAuth(signed) {
  signedOut.classList.toggle("hidden", signed);
  signedIn.classList.toggle("hidden", !signed);
}

function shopLabel(alt) {
  const brand = String(alt.brand_name || "").trim();
  return brand ? `Shop at ${brand} →` : "Shop →";
}

function renderResult(payload) {
  resultEl.classList.remove("hidden");
  resultEl.innerHTML = "";
  if (!payload) return;

  const capture = payload.capture || {};
  const copy = payload.copy || {};
  const links = payload.links || {};
  const alts = Array.isArray(capture.alternatives) ? capture.alternatives.slice(0, 3) : [];

  const title = document.createElement("h2");
  title.textContent = payload.duplicate ? "Already in Inspirations" : "Saved";
  resultEl.appendChild(title);

  const tag = document.createElement("p");
  tag.className = "headline";
  tag.textContent = copy.tagline || "Know the material before you buy.";
  resultEl.appendChild(tag);

  if (copy.compositionHeadline) {
    const h = document.createElement("p");
    h.className = "headline";
    h.textContent = copy.compositionHeadline;
    resultEl.appendChild(h);
  }
  if (copy.compositionDetail) {
    const d = document.createElement("p");
    d.textContent = copy.compositionDetail;
    resultEl.appendChild(d);
  }

  if (copy.decodeAction && (links.viewAllMatchesUrl || copy.viewAllMatchesUrl)) {
    const a = document.createElement("p");
    const link = document.createElement("a");
    link.href = links.viewAllMatchesUrl || copy.viewAllMatchesUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = copy.decodeAction;
    a.appendChild(link);
    resultEl.appendChild(a);
  }

  const openUrl = links.openInIntertexeUrl || copy.openInIntertexeUrl;
  if (openUrl) {
    const a = document.createElement("p");
    const link = document.createElement("a");
    link.href = openUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open in INTERTEXE";
    a.appendChild(link);
    resultEl.appendChild(a);
  }

  for (const alt of alts) {
    const card = document.createElement("a");
    card.className = "alt";
    card.href = "#";
    card.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: "OPEN_MATCH", alt, captureId: capture.id });
    });
    const img = document.createElement("img");
    img.alt = "";
    if (alt.image_url) img.src = alt.image_url;
    const meta = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = alt.name || alt.brand_name || "TX Match";
    const brand = document.createElement("span");
    brand.textContent = alt.composition || alt.why || "";
    const cta = document.createElement("span");
    cta.textContent = shopLabel(alt);
    meta.appendChild(name);
    meta.appendChild(brand);
    meta.appendChild(cta);
    card.appendChild(img);
    card.appendChild(meta);
    resultEl.appendChild(card);
  }

  if (copy.affiliateDisclosure) {
    const disc = document.createElement("p");
    disc.className = "disclosure";
    disc.textContent = copy.affiliateDisclosure;
    resultEl.appendChild(disc);
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
