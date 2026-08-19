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
import { materialInsightFromText, type MaterialInsight } from "./material-insight";
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
  priceLabel: string;
  currency: string | null;
  mixedCurrency: boolean;
  why: string | null;
  naturalFiberPercent: number | null;
};

export type CaptureResultView = {
  title: string;
  brandLine: string;
  priceLabel: string;
  currency: string | null;
  materialLine: string;
  materialHeadline: string;
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
  return {
    label: mixed ? `${label} · ${String(currency).toUpperCase()}` : label,
    mixed,
  };
}

export function buildCaptureResultView(
  capture: Record<string, unknown> | null | undefined
): CaptureResultView {
  const row = capture || {};
  const copy = buildTxMatchCopyFromCapture(row);
  const display = formatCompositionDisplay(
    String(copy.compositionHeadline || row.composition_text || "")
  );
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
  const alternatives: CaptureResultAltView[] = alts.slice(0, 12).map((raw, idx) => {
    const alt = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const composed = formatCompositionDisplay(String(alt.composition || ""));
    const priced = formatAltPriceLabel(
      alt.price as number | string | null,
      alt.currency != null ? String(alt.currency) : null,
      currency
    );
    return {
      id: String(alt.id || idx),
      name: titleCaseName(String(alt.name || alt.brand_name || "TX Match")),
      brandName: titleCaseName(String(alt.brand_name || "")),
      imageUrl: alt.image_url ? String(alt.image_url) : null,
      url: alt.url ? String(alt.url) : null,
      brandSlug: alt.brand_slug ? String(alt.brand_slug) : null,
      compositionLine:
        composed.headline === "Material details unavailable" ? "" : composed.headline,
      priceLabel: priced.label,
      currency: alt.currency != null ? String(alt.currency) : null,
      mixedCurrency: priced.mixed,
      why: alt.why != null ? String(alt.why) : null,
      naturalFiberPercent:
        alt.natural_fiber_percent != null ? Number(alt.natural_fiber_percent) : null,
    };
  });
  const links = buildTxMatchLinks(row.id != null ? String(row.id) : null);
  const count = alternatives.length;
  return {
    title: titleCaseName(String(row.title || row.brand_name || "Saved piece")),
    brandLine,
    priceLabel,
    currency,
    materialLine: display.materialLine,
    materialHeadline: display.headline,
    liningNote: display.hasSyntheticLining
      ? "Synthetic lining — not the same as a fully natural construction."
      : null,
    insight: materialInsightFromText(String(row.composition_text || copy.compositionHeadline || "")),
    alternativesTitle:
      count > 0 ? `${count} better-material matches` : copy.alternativesTitle,
    alternatives,
    tagline: copy.tagline || TX_MATCH_TAGLINE,
    affiliateDisclosure: copy.affiliateDisclosure || AFFILIATE_DISCLOSURE,
    openInIntertexeUrl: links?.openInIntertexeUrl || copy.openInIntertexeUrl || null,
    copy,
  };
}
