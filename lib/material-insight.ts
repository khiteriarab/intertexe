import { parseCompositionText } from "./material-intelligence/composition";
import { formatCompositionDisplay } from "./composition-display";

export type MaterialInsightTone = "natural" | "mixed" | "synthetic" | "unknown";

export type MaterialInsight = {
  share: number | null;
  tone: MaterialInsightTone;
  label: string;
};

/** Natural-fiber share and a shopper-facing label. Never invents percentages. */
export function materialInsightFromText(text: string | null | undefined): MaterialInsight {
  const display = formatCompositionDisplay(text);
  const parsed = parseCompositionText(text);
  const share = parsed.natural_fiber_percentage;
  if (display.hasSyntheticLining) {
    return {
      share: share != null ? share : null,
      tone: "mixed",
      label: "Natural shell with a synthetic lining",
    };
  }
  if (share == null) {
    if (parsed.components.length || display.fibers.length) {
      return { share: null, tone: "unknown", label: "Percentages were not listed." };
    }
    return { share: null, tone: "unknown", label: "Material details unavailable" };
  }
  if (share >= 80) return { share, tone: "natural", label: "This mix is mostly natural" };
  if (share >= 50) return { share, tone: "mixed", label: "Natural fiber is typical here" };
  return { share, tone: "synthetic", label: "This mix is mostly synthetic" };
}

export function savingsPercent(original: number | null | undefined, other: number | null | undefined): number | null {
  const a = Number(original);
  const b = Number(other);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b >= a) return null;
  return Math.round(((a - b) / a) * 100);
}
