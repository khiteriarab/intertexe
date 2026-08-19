/**
 * Shopper-facing TX Match copy shared by the Chrome popup and /matches page.
 * Fashion language only — never expose ranking internals.
 */

import { formatCompositionDisplay } from "./composition-display";
import { materialInsightFromText } from "./material-insight";
import { garmentLabel } from "./tx-match-copy";

export const COMPOSITION_EDITORIAL_JOIN = " · ";

export type TxMatchSort = "best" | "natural" | "style" | "price" | "pure";

export const TX_MATCH_SORTS: Array<{ id: TxMatchSort; label: string }> = [
  { id: "best", label: "Best Match" },
  { id: "natural", label: "More Natural" },
  { id: "style", label: "Similar Style" },
  { id: "price", label: "Similar Price" },
  { id: "pure", label: "100% Natural" },
];

const AVOID_RE = /\b(polyester|poli[eé]ster|nylon|polyamide|poliamida|acrylic)\b/i;
const CELLULOSIC_RE = /\b(lyocell|tencel|cupro|modal)\b/i;
const SILHOUETTE_RE =
  /\b(flared?|wide-?leg|straight|bootcut|skinny|slim|cropped|relaxed|oversized|midi|maxi|mini|a-?line|wrap|slip|tailored)\b/i;

export function editorialCompositionLine(raw: string | null | undefined): string {
  const display = formatCompositionDisplay(raw);
  if (!display.shellLine || display.headline === "Material details unavailable") return "";
  let line = display.shellLine.replace(/;\s+/g, COMPOSITION_EDITORIAL_JOIN);
  if (display.liningLine) {
    line = `${line}${COMPOSITION_EDITORIAL_JOIN}lining ${display.liningLine.replace(/;\s+/g, COMPOSITION_EDITORIAL_JOIN)}`;
  }
  return line.replace(/\s*—\s*percentage not provided/gi, "").trim();
}

export function materialClassification(raw: string | null | undefined): string {
  const text = String(raw || "");
  const display = formatCompositionDisplay(text);
  const insight = materialInsightFromText(text);
  const hasAvoid = AVOID_RE.test(text);
  const hasCellulosic = CELLULOSIC_RE.test(text);
  const fibers = display.fibers;

  if (insight.share != null && insight.share >= 98 && fibers.length === 1) {
    return `Pure ${fibers[0]}`;
  }
  if (insight.share != null && insight.share >= 80) return "Natural Fiber";
  if (!hasAvoid && (hasCellulosic || (insight.share != null && insight.share >= 20) || fibers.length >= 2)) {
    return "Natural-Fiber Blend";
  }
  if (display.hasSyntheticLining) return "Natural Shell";
  if (insight.tone === "mixed") return "Natural-Fiber Blend";
  if (insight.tone === "synthetic") return "Mostly Synthetic";
  return "";
}

/** One concise card signal. Prefers a true, useful fact over a score stack. */
export function materialCardSignal(opts: {
  composition?: string | null;
  naturalFiberPercent?: number | null;
}): string {
  const text = String(opts.composition || "");
  const display = formatCompositionDisplay(text);
  const insight = materialInsightFromText(text);
  const share =
    insight.share != null
      ? insight.share
      : opts.naturalFiberPercent != null && Number.isFinite(opts.naturalFiberPercent)
        ? Number(opts.naturalFiberPercent)
        : null;
  const hasAvoid = AVOID_RE.test(text);

  if (display.hasPercentages && display.fibers.length === 1 && (share == null || share >= 98)) {
    return `100% ${display.fibers[0]}`;
  }
  if (share != null && share >= 90) return `${Math.round(share)}% Natural Fibers`;
  if (text && !hasAvoid && (display.fibers.length || display.hasPercentages)) return "No Polyester";
  if (share != null && share > 0) return `${Math.round(share)}% Natural Fibers`;
  return editorialCompositionLine(text);
}

export function originalPieceLabel(brand: string | null | undefined, title: string | null | undefined): string {
  const t = String(title || "").trim();
  const b = String(brand || "").trim();
  if (!b) return t;
  if (!t) return b;
  if (t.toLowerCase().startsWith(b.toLowerCase())) return t;
  return `${b} ${t}`;
}

function garmentPlural(raw: string | null | undefined): string {
  const g = garmentLabel(raw);
  if (g === "jeans") return "jeans";
  if (g === "dress") return "dresses";
  if (g === "skirt") return "skirts";
  if (g === "pant") return "trousers";
  if (g === "jacket") return "jackets";
  if (g === "knit") return "knits";
  if (g === "top") return "tops";
  return "matches";
}

export function matchHeroCopy(opts: {
  title?: string | null;
  brandName?: string | null;
  category?: string | null;
  altCount: number;
}): { eyebrow: string; heading: string; supporting: string } {
  const piece = originalPieceLabel(opts.brandName, opts.title) || "this piece";
  const plural = garmentPlural(`${opts.title || ""} ${opts.category || ""}`);
  const count = opts.altCount > 0 ? opts.altCount : 0;
  const countLabel = count > 0 ? `${count} alternative${count === 1 ? "" : "s"}` : "Alternatives";
  return {
    eyebrow: "Better material matches",
    heading: `Better ${plural}, by material.`,
    supporting: `${countLabel} to the ${piece}, selected for stronger material composition and similar style.`,
  };
}

export function fashionWhyReasons(opts: {
  why?: string | null;
  composition?: string | null;
  name?: string | null;
  originalTitle?: string | null;
  originalPrice?: number | null;
  price?: number | null;
  naturalFiberPercent?: number | null;
}): string[] {
  const out: string[] = [];
  const originalSil = String(opts.originalTitle || "").match(SILHOUETTE_RE)?.[0];
  const altHay = `${opts.name || ""} ${opts.why || ""}`;
    if (originalSil && new RegExp(originalSil.replace(/-/g, "-?"), "i").test(altHay)) {
    out.push(`Similar ${originalSil.toLowerCase()} silhouette`);
  } else if (/\bsilhouette|garment type|category\b/i.test(String(opts.why || ""))) {
    out.push("Similar silhouette");
  }

  if (opts.originalPrice != null && opts.price != null && opts.originalPrice > 0) {
    const diff = Math.abs(opts.price - opts.originalPrice) / opts.originalPrice;
    if (diff <= 0.4) out.push("Comparable price");
  } else if (/similar price/i.test(String(opts.why || ""))) {
    out.push("Comparable price");
  }

  const signal = materialCardSignal({
    composition: opts.composition,
    naturalFiberPercent: opts.naturalFiberPercent,
  });
  if (signal) {
    if (/^100%/.test(signal)) out.push(`${signal} construction`);
    else out.push(signal);
  }

  const unique = [...new Set(out)].slice(0, 3);
  if (unique.length) return unique;
  return String(opts.why || "")
    .split(/\s*·\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function parseListedPrice(raw: number | string | null | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  const n = parseFloat(String(raw || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type SortableTxMatch = {
  name?: string | null;
  why?: string | null;
  composition?: string | null;
  compositionLine?: string | null;
  price?: number | string | null;
  priceLabel?: string | null;
  naturalFiberPercent?: number | null;
};

export function sortTxMatches<T extends SortableTxMatch>(
  items: T[],
  mode: TxMatchSort,
  originalPrice?: number | null
): T[] {
  const copy = items.slice();
  if (mode === "best") return copy;
  if (mode === "pure") {
    return copy.filter((item) => {
      const share = item.naturalFiberPercent;
      const signal = materialCardSignal({
        composition: item.composition || item.compositionLine,
        naturalFiberPercent: share,
      });
      return (typeof share === "number" && share >= 99) || /^100%/.test(signal);
    });
  }

  copy.sort((a, b) => {
    if (mode === "natural") {
      return (b.naturalFiberPercent || 0) - (a.naturalFiberPercent || 0);
    }
    if (mode === "price") {
      const target = originalPrice || 0;
      const pa = parseListedPrice(a.price) ?? parseListedPrice(a.priceLabel) ?? 0;
      const pb = parseListedPrice(b.price) ?? parseListedPrice(b.priceLabel) ?? 0;
      return Math.abs(pa - target) - Math.abs(pb - target);
    }
    const score = (item: T) => {
      const hay = `${item.name || ""} ${item.why || ""}`.toLowerCase();
      let n = 0;
      if (SILHOUETTE_RE.test(hay)) n += 3;
      if (/\b(jean|denim|trouser|pant|dress|skirt)\b/.test(hay)) n += 2;
      if (/similar silhouette|same garment|same category/i.test(String(item.why || ""))) n += 2;
      return n;
    };
    return score(b) - score(a);
  });
  return copy;
}
