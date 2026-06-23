/** Shared product guards for rails, edits, and catalog views. */

export type CompositionPart = { fiber: string; percent: number };

const LINING_INDICATORS = [
  "inner lining",
  "body lining",
  "pocket lining",
  "shell lining",
  "lining",
];

export function compositionBody(composition: string): string {
  return splitCompositionSections(composition).shell;
}

/** Split retailer copy into outer fabric vs lining (shell is used for NFP display). */
export function splitCompositionSections(composition: string): { shell: string; lining: string | null } {
  const raw = (composition || "").trim();
  if (!raw) return { shell: "", lining: null };

  const explicit = raw.split(/\b(?:inner\s+)?lining\s*:/i);
  if (explicit.length > 1) {
    const shell = explicit[0].trim().replace(/[.,]\s*$/, "");
    const lining = explicit.slice(1).join(":").trim();
    return { shell, lining: lining || null };
  }

  const lower = raw.toLowerCase();
  for (const indicator of [...LINING_INDICATORS].sort((a, b) => b.length - a.length)) {
    const idx = lower.indexOf(indicator);
    if (idx <= 0) continue;
    const before = raw.slice(0, idx).trim().replace(/[.,]\s*$/, "");
    if (before.includes("%")) {
      return { shell: before, lining: raw.slice(idx).trim() };
    }
  }

  const legacyBody = (raw.split(/\b(trim|embroidery\s+fabric|embroidery|lining|contrast|pocket|rib)\s*:/i)[0] ?? "").trim();
  return { shell: legacyBody, lining: null };
}

export function parseCompositionParts(composition: string): CompositionPart[] {
  if (!composition) return [];
  const parts: CompositionPart[] = [];
  const matches = Array.from(
    composition.matchAll(/(\d+)\s*%\s*([a-zA-ZÀ-ÿ\s()\-/®™]+?)(?=[,;]|\d+\s*%|$)/g)
  );
  for (const m of matches) {
    const percent = parseInt(m[1], 10);
    const rawFiber = m[2].trim().replace(/[,;/\s]+$/, "").trim();
    if (rawFiber && percent > 0) parts.push({ fiber: rawFiber, percent });
  }
  if (parts.length === 0) {
    const reverse = Array.from(composition.matchAll(/([a-zA-ZÀ-ÿ\s()\-/®™]+?)\s*(\d+)\s*%/g));
    for (const m of reverse) {
      const rawFiber = m[1].trim().replace(/[,;/\s]+$/, "").trim();
      const percent = parseInt(m[2], 10);
      if (rawFiber && percent > 0) parts.push({ fiber: rawFiber, percent });
    }
  }
  return parts;
}

function splitPartsShellAndLining(parts: CompositionPart[]): { shell: CompositionPart[]; lining: CompositionPart[] } {
  const total = parts.reduce((sum, p) => sum + p.percent, 0);
  if (total <= 100 || parts.length <= 1) return { shell: parts, lining: [] };

  let shellSum = 0;
  const shell: CompositionPart[] = [];
  const lining: CompositionPart[] = [];
  for (const part of parts) {
    if (shellSum + part.percent <= 100) {
      shell.push(part);
      shellSum += part.percent;
    } else {
      lining.push(part);
    }
  }
  if (shell.length === 0) return { shell: parts, lining: [] };
  return { shell, lining };
}

/** Body + lining parts for product detail (avoids merging shell and lining percentages). */
export function parseCompositionForDisplay(composition: string | null | undefined): {
  shellParts: CompositionPart[];
  liningParts: CompositionPart[];
} {
  const { shell, lining } = splitCompositionSections(composition || "");
  let shellParts = parseCompositionParts(shell);
  let liningParts = lining ? parseCompositionParts(lining) : [];

  if (liningParts.length === 0) {
    const merged = parseCompositionParts(composition || "");
    const split = splitPartsShellAndLining(merged);
    if (split.lining.length > 0) {
      shellParts = split.shell;
      liningParts = split.lining;
    } else if (shellParts.length === 0) {
      shellParts = merged;
    }
  }

  return { shellParts, liningParts };
}

export function productBodyMatchesFiber(composition: string, fiber: string): boolean {
  const body = compositionBody(composition).toLowerCase();
  switch (fiber) {
    case "silk":
      return /(silk|mulberry)/.test(body) && !primaryFiberIs(body, ["wool", "cashmere", "cotton"]);
    case "linen":
      return /(linen|flax)/.test(body);
    case "cashmere":
      return /cashmere/.test(body);
    case "wool":
      return /(wool|merino|lambswool)/.test(body);
    case "cotton":
      return /cotton/.test(body) && !/(^|[^a-z])(silk|wool|cashmere)([^a-z]|$)/.test(body);
    case "leather":
    case "leather-suede":
    case "leather_suede":
      return /(leather|suede|lambskin|calfskin|nubuck)/.test(body);
    default:
      return true;
  }
}

function primaryFiberIs(body: string, fibers: string[]): boolean {
  for (const f of fibers) {
    const re = new RegExp(`\\b${f}\\b`);
    if (re.test(body)) return true;
  }
  return false;
}

/** Resort edit: linen or cotton dresses & skirts only — no wool shirts, blazers, etc. */
export function isVacationResortPiece(row: {
  category?: string;
  name?: string;
  composition?: string;
  brandSlug?: string;
  brand_slug?: string;
}): boolean {
  const cat = `${row.category || ""} ${row.name || ""}`.toLowerCase();
  if (!/(dress|skirt|gown|maxi|midi|kaftan|cover-up|coverup)/.test(cat)) return false;
  if (/\b(blazer|coat|jacket|shirt|tee|trouser|pant|jean|sweater|knit|polo|shorts)\b/.test(cat)) {
    return false;
  }

  const body = compositionBody(row.composition || "").toLowerCase();
  const hasLinen = /(linen|flax)/.test(body);
  const hasCotton = /cotton/.test(body);
  if (!hasLinen && !hasCotton) return false;

  if (/(^|[^a-z])(wool|merino|cashmere|alpaca|mohair)([^a-z]|$)/.test(body)) {
    if (!hasLinen && !(hasCotton && /dress/.test(cat))) return false;
  }

  return true;
}

export function isZegnaWomensPiece(row: {
  brandSlug?: string;
  brand_slug?: string;
  category?: string;
  name?: string;
}): boolean {
  const slug = String(row.brandSlug || row.brand_slug || "").toLowerCase();
  if (slug !== "zegna" && !slug.includes("zegna")) return true;
  const cat = `${row.category || ""} ${row.name || ""}`.toLowerCase();
  if (/\b(men|mens|man's|male|boy)\b/.test(cat)) return false;
  if (/\b(suit|tie|brief|boxer)\b/.test(cat)) return false;
  return /(dress|skirt|top|blouse|shirt|knit|coat|jacket|pant|trouser|sweater|lingerie|swim)/.test(cat);
}

export function isEditorialWomensApparel(row: {
  category?: string;
  name?: string;
  composition?: string;
}): boolean {
  const cat = (row.category || "").toLowerCase();
  const name = (row.name || "").toLowerCase();
  if (/(accessories|scarves|bags|shoes|jewelry|belt|hat|glove|sock)/.test(cat)) return false;
  if (/\b(scarf|wallet|sunglasses|keychain|pouch|stole|shawl)\b/.test(name)) return false;
  if (/\b(blazer|suit jacket|sport coat)\b/.test(name) && !/(dress|skirt)/.test(cat)) return false;
  return true;
}
