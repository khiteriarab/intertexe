import { SITE_URL } from "./seo-international";
import { formatCompositionDisplay } from "./composition-display";
import { hasPercentages } from "./capture-page-signals";
import { unpublishedMaterialCopy } from "./unpublished-material";

export const TX_MATCH_TAGLINE = "Know the material before you buy.";
export const AFFILIATE_DISCLOSURE =
  "INTERTEXE may earn a commission from qualifying purchases.";

export type TxMatchCopy = {
  decodeAction: string;
  decodeSupporting: string;
  alternativesTitle: string;
  compositionNote: string | null;
  compositionHeadline: string | null;
  compositionDetail: string | null;
  tagline: string;
  affiliateDisclosure: string;
  viewAllMatchesUrl?: string;
  openInIntertexeUrl?: string;
};

export type TxMatchLinks = {
  viewAllMatchesUrl: string;
  openInIntertexeUrl: string;
};

/** Open in INTERTEXE = original piece + TX Matches on a public /matches page. */
export function buildTxMatchLinks(captureId: string | null | undefined): TxMatchLinks | null {
  const id = String(captureId || "").trim();
  if (!id) return null;
  return {
    viewAllMatchesUrl: `${SITE_URL}/matches/${encodeURIComponent(id)}`,
    openInIntertexeUrl: `${SITE_URL}/matches/${encodeURIComponent(id)}`,
  };
}

const FIBERS = [
  "silk",
  "cashmere",
  "linen",
  "wool",
  "cotton",
  "leather",
  "merino",
] as const;

export function fiberLabel(fiber: string | null | undefined): string | null {
  if (!fiber) return null;
  const f = fiber.toLowerCase().trim();
  if (f === "merino") return "wool";
  if ((FIBERS as readonly string[]).includes(f)) return f;
  return null;
}

export function garmentLabel(raw: string | null | undefined): string | null {
  const t = String(raw || "").toLowerCase();
  if (!t) return null;
  if (/\bskirt/.test(t)) return "skirt";
  if (/\bdress/.test(t)) return "dress";
  if (/\b(jeans?|denim|vaquero)/.test(t)) return "jeans";
  if (/\b(pant|trouser)/.test(t)) return "pant";
  if (/\b(coat|jacket|blazer)/.test(t)) return "jacket";
  if (/\b(sweater|knit|cardigan)/.test(t)) return "knit";
  if (/\b(top|blouse|shirt)/.test(t)) return "top";
  return null;
}

export function buildTxMatchCopy(opts: {
  fiber?: string | null;
  garment?: string | null;
  altCount?: number;
  compositionListed?: boolean;
  listedWithoutPercentages?: boolean;
  listedMaterial?: string | null;
  inferredFiber?: string | null;
  captureId?: string | null;
}): TxMatchCopy {
  const fiber = fiberLabel(opts.inferredFiber || opts.fiber);
  const garment = garmentLabel(opts.garment);
  const look = [fiber, garment].filter(Boolean).join(" ");
  const count = opts.altCount && opts.altCount > 0 ? opts.altCount : null;
  const links = buildTxMatchLinks(opts.captureId);
  const display = formatCompositionDisplay(opts.listedMaterial || opts.inferredFiber || opts.fiber || "");

  const decodeAction = look
    ? count
      ? `See ${count} ${look} matches`
      : `See more ${look} options`
    : "See more like this";

  const alternativesTitle = "Better-material matches";

  let compositionHeadline: string | null = null;
  let compositionDetail: string | null = null;
  let compositionNote: string | null = null;

  if (opts.compositionListed && display.headline !== "Material details unavailable") {
    compositionHeadline = display.materialLine;
    compositionDetail = display.hasSyntheticLace
      ? "Synthetic lace — not the same as a fully natural construction."
      : display.hasSyntheticLining
        ? "Synthetic lining — not the same as a fully natural construction."
        : null;
    compositionNote = [compositionHeadline, compositionDetail].filter(Boolean).join("\n");
  } else if (!opts.compositionListed) {
    const unpublished = unpublishedMaterialCopy({
      title: opts.garment,
      inferredFiber: fiber,
      altCount: count || 0,
    });
    compositionHeadline = unpublished.headline;
    compositionDetail = [unpublished.detail, unpublished.supporting].filter(Boolean).join("\n");
    compositionNote = [compositionHeadline, compositionDetail].filter(Boolean).join("\n");
  }

  return {
    decodeAction,
    decodeSupporting: "Tap to open more pieces in this fabric, style, and price — not a random mix.",
    alternativesTitle,
    compositionNote,
    compositionHeadline,
    compositionDetail,
    tagline: TX_MATCH_TAGLINE,
    affiliateDisclosure: AFFILIATE_DISCLOSURE,
    ...(links || {}),
  };
}

export function buildTxMatchCopyFromCapture(capture: Record<string, unknown> | null | undefined): TxMatchCopy {
  const row = capture || {};
  const attrs =
    row.attributes && typeof row.attributes === "object"
      ? (row.attributes as Record<string, unknown>)
      : {};
  const alts = Array.isArray(row.alternatives) ? row.alternatives : [];
  const composition = String(row.composition_text || attrs.compositionText || "").trim();
  const listed = composition.length > 0 && !/estimated|looks like/i.test(composition);
  let inferred =
    (typeof attrs.inferred_fiber === "string" && attrs.inferred_fiber) ||
    fiberFromText(`${composition} ${row.title || ""}`);
  if (!inferred && alts.length) {
    inferred = fiberFromText(
      alts
        .slice(0, 5)
        .map((a) => (a && typeof a === "object" ? String((a as { composition?: string }).composition || "") : ""))
        .join(" ")
    );
  }
  return buildTxMatchCopy({
    fiber: inferred,
    inferredFiber: inferred,
    garment: String(row.title || row.subcategory || row.category || ""),
    altCount: alts.length,
    compositionListed: listed,
    listedWithoutPercentages: listed && !hasPercentages(composition),
    listedMaterial: listed ? composition : null,
    captureId: row.id != null ? String(row.id) : null,
  });
}

function fiberFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const f of FIBERS) {
    if (new RegExp(`\\b${f}\\b`).test(lower)) return f === "merino" ? "wool" : f;
  }
  if (/\b(charmeuse|chiffon|satin)\b/.test(lower)) return "silk";
  if (/\b(denim|jeans?|vaquero|algod[oó]n)\b/.test(lower)) return "cotton";
  return null;
}
