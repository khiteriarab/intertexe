/** Shared product guards for rails, edits, and catalog views. */

export function compositionBody(composition: string): string {
  return (composition || "").split(/\b(trim|embroidery\s+fabric|embroidery|lining|contrast|pocket|rib)\s*:/i)[0] ?? "";
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
