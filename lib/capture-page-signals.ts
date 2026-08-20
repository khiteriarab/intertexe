/**
 * Pure page-signal helpers for capture enrichment and TX Match display.
 * No network, no schema changes — used to keep retailer-facing material and price honest.
 */

export const FIBER_NAME_RE =
  /\b(cotton|wool|linen|silk|cashmere|viscose|polyester|polyamide|nylon|elastane|spandex|modal|lyocell|tencel|acrylic|rayon|hemp|alpaca|merino|leather|suede|cupro|triacetate|acetate)\b/i;

const FIBER_ALT =
  "cotton|algod[oó]n|algodon|denim|vaquero|wool|lana|linen|lino|silk|seda|cashmere|viscose|viscosa|polyester|poli[eé]ster|polyamide|poliamida|nylon|elastane|elastano|spandex|modal|lyocell|tencel|acrylic|rayon|hemp|alpaca|merino|leather|suede|cupro|triacetate|acetate";

const FIBER_CANON: Record<string, string> = {
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

function fiberCanonKey(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

function titleFiberToken(raw: string): string {
  const key = fiberCanonKey(raw);
  const name = FIBER_CANON[key] || key;
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Collect "55.7% Lyocell" and "Lyocell 55,7%" clauses. Keeps percentages. */
export function collectPercentClauses(raw: string | null | undefined): string[] {
  const t = String(raw || "").replace(/\s+/g, " ");
  if (!t) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (pctRaw: string, fiberRaw: string) => {
    const pct = String(pctRaw || "").replace(",", ".");
    const n = Number(pct);
    if (!Number.isFinite(n) || n <= 0 || n > 100) return;
    const name = titleFiberToken(fiberRaw);
    const key = fiberCanonKey(name);
    if (!name || !key || seen.has(key)) return;
    seen.add(key);
    out.push(`${n}% ${name}`);
  };
  const pctFirst = new RegExp(
    `(\\d{1,3}(?:[.,]\\d+)?)\\s*%\\s*(?:(?:organic|recycled|premium|stretch|pure|extra|fine)\\s+)*(${FIBER_ALT})`,
    "gi"
  );
  const fiberFirst = new RegExp(
    `\\b(${FIBER_ALT})\\s*[:\\-–]?\\s*(\\d{1,3}(?:[.,]\\d+)?)\\s*%`,
    "gi"
  );
  const pctFirstHits = [...t.matchAll(pctFirst)];
  const fiberFirstHits = [...t.matchAll(fiberFirst)];
  const useFiberFirst = fiberFirstHits.length > pctFirstHits.length;
  if (useFiberFirst) {
    for (const m of fiberFirstHits) push(m[2], m[1]);
  } else {
    for (const m of pctFirstHits) push(m[1], m[2]);
  }
  return out;
}

const CONSTRUCTION_LABEL_RE =
  /\b((?:eyelash\s+)?lace|trim|silk\s+satin|satin\s+silk|satin|body|shell|outer(?:\s+fabric)?|lining)\s+composition\s*[:\-–]?\s*/gi;

const LACE_TRIM_PERCENT_RE =
  /\b((?:eyelash\s+)?lace|trim)\s*[:\-–]?\s*(?=\d{1,3}(?:[.,]\d+)?\s*%)/gi;

function constructionKey(label: string): "shell" | "lace" | "lining" {
  const t = String(label || "").toLowerCase();
  if (/\b(lace|trim)\b/.test(t)) return "lace";
  if (/\blining\b/.test(t)) return "lining";
  return "shell";
}

/** Retailer listed lace / eyelash lace / trim as a part, not a blended mix. */
export function pageListsLaceOrTrim(htmlOrText: string | null | undefined): boolean {
  const plain = stripToText(String(htmlOrText || ""));
  if (/\beyelash\s+lace\b/i.test(plain)) return true;
  if (/\bmaterials?\s*[:\-–]\s*[^.]{0,160}\b(lace|trim)\b/i.test(plain)) return true;
  if (/\b(lace|trim)\s+composition\b/i.test(plain)) return true;
  return false;
}

/** Keep lace / satin / lining as separate retailer-listed parts. */
export function extractConstructionParts(htmlOrText: string | null | undefined): {
  shell: string | null;
  lace: string | null;
  lining: string | null;
} {
  const plain = stripToText(String(htmlOrText || "")).slice(0, 40000);
  const empty = { shell: null as string | null, lace: null as string | null, lining: null as string | null };
  if (!plain) return empty;
  const hits: { key: "shell" | "lace" | "lining"; start: number; bodyStart: number }[] = [];
  const re = new RegExp(CONSTRUCTION_LABEL_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain))) {
    hits.push({
      key: constructionKey(m[1] || ""),
      start: m.index,
      bodyStart: m.index + m[0].length,
    });
  }
  const laceRe = new RegExp(LACE_TRIM_PERCENT_RE.source, "gi");
  while ((m = laceRe.exec(plain))) {
    hits.push({
      key: "lace",
      start: m.index,
      bodyStart: m.index + m[0].length,
    });
  }
  hits.sort((a, b) => a.start - b.start);
  if (!hits.length) return empty;
  const found = { ...empty };
  for (let i = 0; i < hits.length; i++) {
    const stop = i + 1 < hits.length ? hits[i + 1].start : hits[i].bodyStart + 220;
    const chunk = plain.slice(hits[i].bodyStart, stop);
    const clauses = collectPercentClauses(chunk);
    if (!clauses.length) continue;
    const line = clauses.join("; ");
    if (!found[hits[i].key]) found[hits[i].key] = line;
  }
  return found;
}

export function formatConstructionStorage(parts: {
  shell: string | null;
  lace: string | null;
  lining: string | null;
}): string | null {
  if (!parts.shell || (!parts.lace && !parts.lining)) return null;
  const bits = [parts.shell];
  if (parts.lace) bits.push(`lace: ${parts.lace}`);
  if (parts.lining) bits.push(`lining: ${parts.lining}`);
  return bits.join("; ");
}

/**
 * Read a composition formula from visible page text / JSON-LD snippets.
 * Prefers percentage clauses over a name-only "Denim" label.
 * Keeps lace vs satin as listed parts instead of mashing them into one mix.
 */
function formatOverflowAsLace(clauses: string[]): string | null {
  if (clauses.length < 2) return null;
  const shell = clauses.filter((line) => /^9[8-9](?:\.\d+)?%|^100(?:\.0+)?%/.test(line));
  const rest = clauses.filter((line) => !shell.includes(line));
  if (!shell.length || !rest.length) return null;
  return `${shell.join("; ")}; lace: ${rest.join("; ")}`;
}

export function extractCompositionFromPageText(htmlOrText: string | null | undefined): string | null {
  const plain = stripToText(String(htmlOrText || "")).slice(0, 40000);
  const constructed = formatConstructionStorage(extractConstructionParts(plain));
  if (constructed) return constructed;
  const clauses = collectPercentClauses(plain);
  if (clauses.length) {
    if (pageListsLaceOrTrim(plain)) {
      return formatOverflowAsLace(clauses) || clauses.join("; ");
    }
    return clauses.join("; ");
  }
  return extractLabeledMaterial(plain);
}

const PROMO_RE =
  /\b(off|order|shipping|sale|discount|promo|code|subscribe|newsletter|members?)\b/i;

const LOCAL_CURRENCY_RANK: Record<string, number> = {
  EUR: 3,
  GBP: 3,
  CHF: 3,
  SEK: 2,
  DKK: 2,
  NOK: 2,
  JPY: 2,
  AUD: 2,
  CAD: 2,
  KRW: 2,
  AED: 2,
  USD: 1,
};

const TLD_COUNTRY: Record<string, string> = {
  uk: "GB",
  gb: "GB",
  fr: "FR",
  de: "DE",
  es: "ES",
  it: "IT",
  nl: "NL",
  ie: "IE",
  pt: "PT",
  be: "BE",
  at: "AT",
  ch: "CH",
  se: "SE",
  dk: "DK",
  no: "NO",
  pl: "PL",
  au: "AU",
  ca: "CA",
  jp: "JP",
  kr: "KR",
  us: "US",
};

export type MoneyOffer = { price: number | null; currency: string | null };

export function hasPercentages(text: string | null | undefined): boolean {
  return /\d+(?:[.,]\d+)?\s*%/.test(String(text || ""));
}

export function looksLikePercentageComposition(text: string): boolean {
  if (!text || text.length > 180) return false;
  if (PROMO_RE.test(text)) return false;
  if (!hasPercentages(text)) return false;
  return FIBER_NAME_RE.test(text) || collectPercentClauses(text).length > 0;
}

/** Prefer a listed percentage formula over a name-only label such as JSON-LD "Denim". */
export function preferPercentageComposition(
  existing: string | null | undefined,
  candidate: string | null | undefined
): string | null {
  const current = String(existing || "").trim() || null;
  const next = String(candidate || "").trim() || null;
  if (!next) return current;
  if (!current) return next;
  const currentParts = /\b(?:lace|trim|lining)\s*:/i.test(current);
  const nextParts = /\b(?:lace|trim|lining)\s*:/i.test(next);
  if (currentParts && !nextParts) return current;
  if (nextParts && !currentParts && looksLikePercentageComposition(next)) return next;
  if (looksLikePercentageComposition(next) && !looksLikePercentageComposition(current)) {
    return next;
  }
  return current;
}

/** Short retailer material line such as "Silk" or "Silk, elastane" — no % required. */
export function looksLikeListedMaterial(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t || t.length > 180) return false;
  if (PROMO_RE.test(t)) return false;
  if (/\b(looks like|estimated|similar to|inspired)\b/i.test(t)) return false;
  if (!FIBER_NAME_RE.test(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 16) return false;
  return true;
}

export function normalizeListedMaterial(raw: string): string {
  const t = String(raw || "").replace(/\s+/g, " ").trim();
  if (!t) return t;
  // Keep retailer-listed lace/trim/lining labels. Flattening percents would
  // mash a silk body with nylon lace trim into one impossible 200% mix.
  if (/\b(?:lace|trim|lining)\s*:/i.test(t)) return t;
  if (looksLikePercentageComposition(t)) {
    const clauses = collectPercentClauses(t);
    if (clauses.length) return clauses.join("; ");
    const m = t.match(
      /(\d+(?:[.,]\d+)?%\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s/-]*(?:[,;/]\s*\d+(?:[.,]\d+)?%\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s/-]*){0,6})/
    );
    return (m?.[1] || t).trim();
  }
  return t.replace(FIBER_NAME_RE, (fiber) => titleCaseName(fiber));
}

/**
 * Capture "Material: silk" / "Fabric: Silk" / "Composition: …" from visible page text.
 */
export function extractLabeledMaterial(htmlOrText: string): string | null {
  const plain = stripToText(htmlOrText).slice(0, 40000);
  const re =
    /(?:material|composition|fabric|composici[oó]n|tejido|materiales|made\s+from|made\s+of|outer(?:\s+fabric)?|shell|main\s+fabric)\s*[:\-–]?\s*([^\n]{1,220})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain))) {
    const chunk = m[1] || "";
    const clauses = collectPercentClauses(chunk);
    if (clauses.length) return clauses.join("; ");
    const candidate = normalizeListedMaterial(chunk);
    if (looksLikePercentageComposition(candidate) || looksLikeListedMaterial(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function extractVisibleOffer(htmlOrText: string): MoneyOffer {
  const plain = stripToText(htmlOrText).slice(0, 20000);
  const found: { price: number; currency: string }[] = [];
  const re =
    /(?:(€|£|\$|EUR|GBP|USD)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?))|(?:(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)\s*(€|EUR))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain))) {
    const symbol = m[1] || m[4] || "";
    const amountRaw = m[2] || m[3] || "";
    const currency = currencyFromSymbol(symbol);
    const price = parseAmount(amountRaw);
    if (!currency || price == null || price < 10 || price > 50000) continue;
    found.push({ price, currency });
  }
  if (!found.length) return { price: null, currency: null };
  const bestCurrency = found.reduce((best, item) => {
    const rank = LOCAL_CURRENCY_RANK[item.currency] || 0;
    const bestRank = LOCAL_CURRENCY_RANK[best] || 0;
    return rank > bestRank ? item.currency : best;
  }, found[0].currency);
  const match = found.find((item) => item.currency === bestCurrency) || found[0];
  return { price: match.price, currency: match.currency };
}

/** When JSON-LD is USD and the page shows €, keep the shopper-facing offer. */
export function preferRetailerFacingOffer(structured: MoneyOffer, visible: MoneyOffer): MoneyOffer {
  const visOk = visible.price != null && Boolean(visible.currency);
  const strOk = structured.price != null;
  if (visOk && strOk && visible.currency && structured.currency && visible.currency !== structured.currency) {
    const visRank = LOCAL_CURRENCY_RANK[visible.currency] || 0;
    const strRank = LOCAL_CURRENCY_RANK[structured.currency] || 0;
    return visRank >= strRank ? visible : structured;
  }
  if (visOk && (!strOk || !structured.currency)) return visible;
  return {
    price: structured.price ?? visible.price,
    currency: structured.currency || visible.currency || null,
  };
}

export function countryFromPage(html: string, hostname: string | null | undefined): string | null {
  const locale =
    html.match(/<meta[^>]*(?:property|name)=["']og:locale["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:locale["']/i)?.[1];
  const fromLocale = countryFromLocale(locale);
  if (fromLocale && fromLocale !== "US") return fromLocale;
  const fromHost = countryFromHostname(hostname);
  if (fromHost) return fromHost;
  return null;
}

export function countryFromHostname(hostname: string | null | undefined): string | null {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (!host) return null;
  const parts = host.split(".");
  const tld = parts[parts.length - 1] || "";
  if (tld === "uk" || (parts.length > 2 && parts[parts.length - 2] === "co" && tld.length === 2)) {
    if (tld === "uk") return "GB";
  }
  if (parts.length >= 3 && parts[parts.length - 2] === "co" && tld === "uk") return "GB";
  return TLD_COUNTRY[tld] || null;
}

export function titleCaseName(value: string | null | undefined): string {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (/^intertexe$/i.test(raw)) return "INTERTEXE";
  const shouldRewrite = raw === raw.toUpperCase() || raw === raw.toLowerCase();
  const source = shouldRewrite ? raw.toLowerCase() : raw;
  return source.replace(/(^|[\s/,&-])([a-zà-ÿ])/g, (_, prefix: string, ch: string) => prefix + ch.toUpperCase());
}

export function uniqueTitleCaseNames(...values: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const labeled = titleCaseName(displayNameFromRetailer(value));
    if (!labeled) continue;
    const key = labeled.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(labeled);
  }
  return out;
}

export function shopAtLabel(retailerOrBrand: string | null | undefined): string {
  const name = titleCaseName(displayNameFromRetailer(retailerOrBrand)) || "retailer";
  return `Shop at ${name} →`;
}

export function formatCapturePrice(
  price?: number | string | null,
  currency?: string | null
): string | null {
  if (price == null || price === "") return null;
  const num = typeof price === "string" ? parseFloat(price.replace(/[^0-9.,-]/g, "").replace(",", ".")) : Number(price);
  if (!Number.isFinite(num)) return null;
  const cur = String(currency || "").trim().toUpperCase();
  if (!cur) return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(num);
  const locale = cur === "EUR" ? "en-IE" : cur === "GBP" ? "en-GB" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${cur} ${num}`;
  }
}

export function formatCountryName(code: string | null | undefined): string | null {
  const cc = String(code || "").trim().toUpperCase();
  if (!cc || cc.length !== 2) return null;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(cc);
    return name || cc;
  } catch {
    return cc;
  }
}

export function formatCheckedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Checked ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

function displayNameFromRetailer(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const host = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) && !raw.includes(" ")) {
    return host.split(".")[0];
  }
  return raw;
}

function stripToText(html: string): string {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function currencyFromSymbol(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  if (s === "€" || s === "EUR") return "EUR";
  if (s === "£" || s === "GBP") return "GBP";
  if (s === "$" || s === "USD") return "USD";
  return null;
}

function parseAmount(raw: string): number | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  let normalized = s;
  if (s.includes(",") && s.includes(".")) {
    normalized =
      s.lastIndexOf(",") > s.lastIndexOf(".")
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (/^\d{1,3},\d{2}$/.test(s)) {
    normalized = s.replace(",", ".");
  } else {
    normalized = s.replace(/,/g, "");
  }
  const num = parseFloat(normalized);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function countryFromLocale(locale: string | null | undefined): string | null {
  const s = String(locale || "").trim();
  const m = s.match(/^[a-z]{2}[_-]([A-Z]{2})/i);
  return m?.[1] ? m[1].toUpperCase() : null;
}
