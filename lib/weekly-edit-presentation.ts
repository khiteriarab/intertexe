import { editorialHeroForSlug } from "./editorial-assets";
import { formatCompositionDisplay } from "./composition-display";

const SITE = "https://www.intertexe.com";

export function absolutePublicUrl(src: string): string {
  const value = String(src || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE}${value.startsWith("/") ? value : `/${value}`}`;
}

export function collectionSlugFromName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\s+/g, "-");
}

export function collectionEditTitle(name: string): string {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "The Edit";
  if (/edit$/i.test(trimmed)) return trimmed;
  return `The ${trimmed} Edit`;
}

export function collectionImageUrl(name: string): string {
  return absolutePublicUrl(editorialHeroForSlug(collectionSlugFromName(name)));
}

export function displayProductName(name: string, brand: string): string {
  const product = String(name || "").trim();
  const house = String(brand || "").trim();
  if (!product || !house) return product;
  const escaped = house.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return product.replace(new RegExp(`^${escaped}\\s+`, "i"), "").trim() || product;
}

export type WeeklyEditMaterialSpec = {
  label: string;
  verified: boolean;
};

/**
 * Compact shopping spec for the Weekly Edit.
 * Prefers a composition clause ("100% SILK") over a generic natural-fiber %.
 */
export function weeklyEditMaterialSpec(opts: {
  composition?: string | null;
  naturalFiberPercent?: number | null;
}): WeeklyEditMaterialSpec {
  const nfp = Math.round(Number(opts.naturalFiberPercent) || 0);
  const verified = nfp >= 90;
  const display = formatCompositionDisplay(opts.composition);
  const shell = String(display.shellLine || "").replace(/\s+—\s+percentage not provided/i, "").trim();
  const firstClause = shell.split(/\s*;\s*/)[0] || shell;
  const pctFiber = firstClause.match(/^(\d+(?:\.\d+)?)%\s+(.+)$/i);
  if (pctFiber) {
    const pct = Math.round(Number(pctFiber[1]));
    const fiber = pctFiber[2].replace(/\s+/g, " ").trim().toUpperCase();
    if (fiber && Number.isFinite(pct) && pct > 0) {
      return { label: `${pct}% ${fiber}`, verified };
    }
  }
  const fiberName = String(display.fibers[0] || "").trim().toUpperCase();
  if (nfp === 100 && fiberName) {
    return { label: `100% ${fiberName}`, verified };
  }
  if (nfp > 0) {
    return { label: `${nfp}% NATURAL FIBER`, verified };
  }
  if (fiberName) return { label: fiberName, verified };
  return { label: "", verified: false };
}

export function pairProducts<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

export function saleSectionHeading(products: { price: number }[]): string {
  if (products.length > 0 && products.every((product) => product.price < 500)) {
    return "Under $500";
  }
  return "On sale";
}

export function compactFiberCopy(fact: string): string {
  const parts = String(fact || "")
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(0, 3).join(" ");
}

export function fiberDiscoverHref(fiber: string): string {
  const key = String(fiber || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const param = key === "leather" ? "leather" : key;
  return `https://www.intertexe.com/shop?fiber=${encodeURIComponent(param || "natural")}`;
}
