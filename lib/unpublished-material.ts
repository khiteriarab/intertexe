import { formatCompositionDisplay } from "./composition-display";

export type UnpublishedMaterialCopy = {
  headline: string;
  materialLine: string;
  detail: string | null;
  supporting: string | null;
  detected: boolean;
};

function garmentName(raw: string): string | null {
  const t = raw.toLowerCase();
  if (!t.trim()) return null;
  if (/\bskirt/.test(t)) return "skirt";
  if (/\bdress/.test(t)) return "dress";
  if (/\b(jeans?|denim|vaquero)/.test(t)) return "jeans";
  if (/\b(pant|trouser)/.test(t)) return "pant";
  if (/\b(coat|jacket|blazer)/.test(t)) return "jacket";
  if (/\b(sweater|knit|cardigan)/.test(t)) return "knit";
  if (/\b(top|blouse|shirt)/.test(t)) return "top";
  return null;
}

function fiberName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const f = raw.toLowerCase().trim();
  if (f === "merino") return "wool";
  if (["silk", "cashmere", "linen", "wool", "cotton", "leather"].includes(f)) return f;
  return null;
}

function titleCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function haystack(opts: {
  compositionText?: string | null;
  title?: string | null;
  category?: string | null;
}): string {
  return `${opts.title || ""} ${opts.category || ""} ${opts.compositionText || ""}`;
}

function inferredFiberName(opts: {
  compositionText?: string | null;
  title?: string | null;
  category?: string | null;
  inferredFiber?: string | null;
}): string | null {
  const labeled = fiberName(opts.inferredFiber);
  if (labeled) return labeled;
  const t = haystack(opts).toLowerCase();
  if (/\b(denim|jeans?|vaquero|algod[oó]n)\b/.test(t)) return "cotton";
  if (/\b(charmeuse|chiffon|satin|silk|seda)\b/.test(t)) return "silk";
  if (/\b(wool|lana|merino|cashmere)\b/.test(t)) return /\bcashmere\b/.test(t) ? "cashmere" : "wool";
  if (/\b(linen|lino)\b/.test(t)) return "linen";
  if (/\b(leather|suede)\b/.test(t)) return "leather";
  if (/\bcotton\b/.test(t)) return "cotton";
  return null;
}

/**
 * Shopper-facing material copy when the retailer did not publish a formula.
 * Never invents percentages. Never says intelligence is missing when the
 * garment/fiber was recognized (e.g. jeans → denim).
 */
export function unpublishedMaterialCopy(opts: {
  compositionText?: string | null;
  title?: string | null;
  category?: string | null;
  inferredFiber?: string | null;
  altCount?: number;
}): UnpublishedMaterialCopy {
  const listed = formatCompositionDisplay(opts.compositionText);
  if (listed.headline !== "Material details unavailable") {
    return {
      headline: listed.headline.replace(/percentage not provided/gi, "exact percentage not provided"),
      materialLine: listed.materialLine.replace(/percentage not provided/gi, "exact percentage not provided"),
      detail: listed.hasSyntheticLace
        ? "Listed as trim — not mixed into the garment body."
        : listed.hasSyntheticLining
          ? "Synthetic lining — not the same as a fully natural construction."
          : listed.hasPercentages
            ? null
            : null,
      supporting: null,
      detected: true,
    };
  }

  const hay = haystack(opts);
  const garment = garmentName(hay);
  const fiber = inferredFiberName(opts);
  const alts = opts.altCount && opts.altCount > 0 ? opts.altCount : 0;
  const denim = garment === "jeans" || /\b(denim|jeans?|vaquero)\b/i.test(hay);

  if (denim) {
    return {
      headline: "Denim detected",
      materialLine: "Denim detected",
      detail: "Exact composition not published",
      supporting:
        alts > 0
          ? "We found better-material alternatives in cotton."
          : "We'll look for better-material alternatives in cotton.",
      detected: true,
    };
  }

  if (fiber) {
    const label = titleCase(fiber);
    return {
      headline: `${label} detected`,
      materialLine: `${label} detected`,
      detail: "Exact composition not published",
      supporting:
        alts > 0 ? `We found better-material alternatives in ${fiber}.` : `We'll look for better-material alternatives in ${fiber}.`,
      detected: true,
    };
  }

  if (garment) {
    return {
      headline: `${titleCase(garment)} detected`,
      materialLine: `${titleCase(garment)} detected`,
      detail: "Exact composition not published",
      supporting: null,
      detected: true,
    };
  }

  return {
    headline: "Exact composition not published",
    materialLine: "Exact composition not published",
    detail: "We'll still look for better-material alternatives from the product on this page.",
    supporting: null,
    detected: false,
  };
}
