/**
 * Prefer lifestyle / on-model photography over flat product-on-white shots.
 */

export type EditorialImageCandidate = {
  imageUrl?: string | null;
  image_url?: string | null;
  name?: string | null;
};

export function scoreImageForEditorial(imageUrl: string, productName: string): number {
  let score = 0;
  const url = (imageUrl || "").toLowerCase();
  const name = (productName || "").toLowerCase();

  if (url.includes("mytheresa")) score += 3;
  if (url.includes("editorial") || url.includes("/look/") || url.includes("campaign")) score += 5;

  if (
    url.includes("_white") ||
    url.includes("product-only") ||
    url.includes("flatlay") ||
    url.includes("flat-lay") ||
    url.includes("/packshot") ||
    url.includes("packshot")
  ) {
    score -= 3;
  }

  if (url.includes("shopify.com") && (url.includes("_grande") || url.includes("_600x"))) {
    score -= 1;
  }

  const fullLengthTerms = ["dress", "maxi", "midi", "gown", "coat", "jacket", "blazer"];
  if (fullLengthTerms.some((t) => name.includes(t))) score += 2;

  const accessoryTerms = ["scarf", "bag", "belt", "hat", "sock", "jewelry", "earring"];
  if (accessoryTerms.some((t) => name.includes(t))) score -= 2;

  return score;
}

export function pickBestEditorialImage(
  candidates: EditorialImageCandidate[],
  opts?: { preferFullLength?: boolean }
): string | null {
  const rows = candidates
    .map((p) => ({
      url: String(p.imageUrl || p.image_url || "").trim(),
      name: String(p.name || ""),
    }))
    .filter((p) => p.url.length > 0);

  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => {
    let sa = scoreImageForEditorial(a.url, a.name);
    let sb = scoreImageForEditorial(b.url, b.name);
    if (opts?.preferFullLength !== false) {
      const full = ["dress", "maxi", "midi", "gown", "coat", "jacket"];
      if (full.some((t) => a.name.includes(t))) sa += 1;
      if (full.some((t) => b.name.includes(t))) sb += 1;
    }
    return sb - sa;
  });

  return sorted[0]?.url ?? null;
}
