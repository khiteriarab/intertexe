import { SITE_URL } from "./seo-international";
import { getUniversalOpenUrl } from "./app-store";
import { hasPercentages } from "./capture-page-signals";

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

/** View all = web TX Match list. Open in INTERTEXE = app (or /capture on desktop). */
export function buildTxMatchLinks(captureId: string | null | undefined): TxMatchLinks | null {
  const id = String(captureId || "").trim();
  if (!id) return null;
  return {
    viewAllMatchesUrl: `${SITE_URL}/inspirations/${encodeURIComponent(id)}`,
    openInIntertexeUrl: getUniversalOpenUrl(`/capture/${id}`, {
      cta: "chrome_extension_open",
    }),
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
  if (/\b(pant|trouser|jean)/.test(t)) return "pant";
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
  const listedName = prettyFiberName(opts.listedMaterial || fiber);

  const decodeAction = look
    ? count
      ? `See ${count} ${look} matches`
      : `See more ${look} options`
    : "See more like this";

  const alternativesTitle = fiber ? `More ${fiber} options` : "Your TX Matches";

  let compositionHeadline: string | null = null;
  let compositionDetail: string | null = null;
  let compositionNote: string | null = null;

  if (opts.compositionListed && opts.listedWithoutPercentages && listedName) {
    compositionHeadline = `Retailer lists: ${listedName}`;
    compositionDetail = "Exact percentages were not provided.";
    compositionNote = `${compositionHeadline}\n${compositionDetail}`;
  } else if (opts.compositionListed && opts.listedMaterial) {
    compositionHeadline = opts.listedMaterial;
    compositionDetail = null;
    compositionNote = null;
  } else if (!opts.compositionListed) {
    compositionHeadline = "Material details unavailable";
    compositionDetail = "Let TX Match find similar pieces with verified compositions.";
    compositionNote = `${compositionHeadline}\n${compositionDetail}`;
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
    garment: String(row.category || row.subcategory || row.title || ""),
    altCount: alts.length,
    compositionListed: listed,
    listedWithoutPercentages: listed && !hasPercentages(composition),
    listedMaterial: listed ? composition : null,
    captureId: row.id != null ? String(row.id) : null,
  });
}

function prettyFiberName(raw: string | null | undefined): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  const fiber = fiberFromText(t);
  if (fiber && t.split(/\s+/).length <= 3 && !hasPercentages(t)) {
    return fiber.charAt(0).toUpperCase() + fiber.slice(1);
  }
  return t;
}

function fiberFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const f of FIBERS) {
    if (new RegExp(`\\b${f}\\b`).test(lower)) return f === "merino" ? "wool" : f;
  }
  if (/\b(charmeuse|chiffon|satin)\b/.test(lower)) return "silk";
  if (/\bdenim\b/.test(lower)) return "cotton";
  return null;
}
