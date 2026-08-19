/**
 * One capture-result view for signed-out popup, signed-in popup, saved page, and web matches.
 * Surfaces should render this object instead of re-parsing composition or price.
 */

import {
  formatCapturePrice,
  titleCaseName,
  uniqueTitleCaseNames,
} from "./capture-page-signals";
import { formatCompositionDisplay } from "./composition-display";
import { unpublishedMaterialCopy } from "./unpublished-material";
import { materialInsightFromText, type MaterialInsight } from "./material-insight";
import {
  editorialCompositionLine,
  fashionWhyReasons,
  materialCardSignal,
  materialClassification,
} from "./tx-match-display";
import {
  AFFILIATE_DISCLOSURE,
  TX_MATCH_TAGLINE,
  buildTxMatchCopyFromCapture,
  buildTxMatchLinks,
  type TxMatchCopy,
} from "./tx-match-copy";

export type CaptureResultAltView = {
  id: string;
  name: string;
  brandName: string;
  imageUrl: string | null;
  url: string | null;
  brandSlug: string | null;
  compositionLine: string;
  cardSignal: string;
  priceLabel: string;
  currency: string | null;
  mixedCurrency: boolean;
  why: string | null;
  whyReasons: string[];
  naturalFiberPercent: number | null;
};

export type CaptureResultView = {
  title: string;
  brandLine: string;
  priceLabel: string;
  currency: string | null;
  materialLine: string;
  materialHeadline: string;
  materialDetail: string | null;
  materialSupporting: string | null;
  compositionEditorial: string;
  classification: string;
  liningNote: string | null;
  insight: MaterialInsight;
  alternativesTitle: string;
  alternatives: CaptureResultAltView[];
  tagline: string;
  affiliateDisclosure: string;
  openInIntertexeUrl: string | null;
  copy: TxMatchCopy;
};

export function formatPriceLabel(
  price: number | string | null | undefined,
  currency?: string | null
): string {
  return formatCapturePrice(price, currency) || "Price unavailable";
}

export function formatAltPriceLabel(
  price: number | string | null | undefined,
  currency: string | null | undefined,
  sourceCurrency: string | null | undefined
): { label: string; mixed: boolean } {
  const label = formatCapturePrice(price, currency);
  if (!label) return { label: "Price unavailable", mixed: false };
  const mixed = Boolean(
    sourceCurrency &&
      currency &&
      String(sourceCurrency).toUpperCase() !== String(currency).toUpperCase()
  );
  return { label, mixed };
}

export function buildCaptureResultView(
  capture: Record<string, unknown> | null | undefined
): CaptureResultView {
  const row = capture || {};
  const copy = buildTxMatchCopyFromCapture(row);
  const attrs =
    row.attributes && typeof row.attributes === "object"
      ? (row.attributes as Record<string, unknown>)
      : {};
  const material = unpublishedMaterialCopy({
    compositionText: String(row.composition_text || attrs.compositionText || ""),
    title: String(row.title || ""),
    category: String(row.subcategory || row.category || ""),
    inferredFiber: typeof attrs.inferred_fiber === "string" ? attrs.inferred_fiber : null,
    altCount: Array.isArray(row.alternatives) ? row.alternatives.length : 0,
  });
  const brandLine = uniqueTitleCaseNames(
    row.brand_name as string,
    row.retailer as string
  ).join(" · ");
  const currency = row.currency != null ? String(row.currency) : null;
  const priceLabel = formatPriceLabel(
    row.price as number | string | null,
    currency
  );
  const alts = Array.isArray(row.alternatives) ? row.alternatives : [];
  const compositionText = String(row.composition_text || attrs.compositionText || "");
  const alternatives: CaptureResultAltView[] = alts.slice(0, 12).map((raw, idx) => {
    const alt = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const composed = formatCompositionDisplay(String(alt.composition || ""));
    const priced = formatAltPriceLabel(
      alt.price as number | string | null,
      alt.currency != null ? String(alt.currency) : null,
      currency
    );
    const compositionLine = editorialCompositionLine(String(alt.composition || "")) ||
      (composed.headline === "Material details unavailable" ? "" : composed.headline);
    const nfp = alt.natural_fiber_percent != null ? Number(alt.natural_fiber_percent) : null;
    const priceNum = typeof alt.price === "number" ? alt.price : null;
    return {
      id: String(alt.id || idx),
      name: titleCaseName(String(alt.name || alt.brand_name || "TX Match")),
      brandName: titleCaseName(String(alt.brand_name || "")),
      imageUrl: alt.image_url ? String(alt.image_url) : null,
      url: alt.url ? String(alt.url) : null,
      brandSlug: alt.brand_slug ? String(alt.brand_slug) : null,
      compositionLine,
      cardSignal: materialCardSignal({
        composition: String(alt.composition || ""),
        naturalFiberPercent: nfp,
      }),
      priceLabel: priced.label,
      currency: alt.currency != null ? String(alt.currency) : null,
      mixedCurrency: priced.mixed,
      why: alt.why != null ? String(alt.why) : null,
      whyReasons: fashionWhyReasons({
        why: alt.why != null ? String(alt.why) : null,
        composition: String(alt.composition || ""),
        name: String(alt.name || ""),
        originalTitle: String(row.title || ""),
        originalPrice: typeof row.price === "number" ? row.price : null,
        price: priceNum,
        naturalFiberPercent: nfp,
      }),
      naturalFiberPercent: nfp,
    };
  });
  const links = buildTxMatchLinks(row.id != null ? String(row.id) : null);
  return {
    title: titleCaseName(String(row.title || row.brand_name || "Saved piece")),
    brandLine,
    priceLabel,
    currency,
    materialLine: material.materialLine,
    materialHeadline: material.headline,
    materialDetail: material.detail,
    materialSupporting: material.supporting,
    compositionEditorial: editorialCompositionLine(compositionText),
    classification: materialClassification(compositionText),
    liningNote: /lace|lining/i.test(String(material.detail || ""))
      ? material.detail
      : formatCompositionDisplay(String(row.composition_text || "")).hasSyntheticLace
        ? "Synthetic lace — not the same as a fully natural construction."
        : formatCompositionDisplay(String(row.composition_text || "")).hasSyntheticLining
          ? "Synthetic lining — not the same as a fully natural construction."
          : null,
    insight: materialInsightFromText(String(row.composition_text || "")),
    alternativesTitle: copy.alternativesTitle,
    alternatives,
    tagline: copy.tagline || TX_MATCH_TAGLINE,
    affiliateDisclosure: copy.affiliateDisclosure || AFFILIATE_DISCLOSURE,
    openInIntertexeUrl: links?.openInIntertexeUrl || copy.openInIntertexeUrl || null,
    copy,
  };
}
