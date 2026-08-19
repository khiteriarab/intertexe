/**
 * One composition formula for every INTERTEXE surface.
 * Join clauses with "; ". Never print a raw extraction array.
 */

export const COMPOSITION_JOIN = "; ";
export const PERCENTAGE_NOT_PROVIDED = "percentage not provided";

const FIBER_CAPTURE =
  /\b(organic\s+|recycled\s+)?(cotton|wool|linen|silk|cashmere|viscose|polyester|polyamide|nylon|elastane|spandex|modal|lyocell|tencel|acrylic|rayon|hemp|alpaca|merino|leather|suede|cupro|triacetate|acetate)\b/gi;

const SYNTHETIC = new Set([
  "viscose",
  "polyester",
  "polyamide",
  "nylon",
  "elastane",
  "spandex",
  "acrylic",
  "rayon",
  "acetate",
  "triacetate",
]);

export type CompositionDisplay = {
  fibers: string[];
  shellLine: string;
  liningLine: string | null;
  hasPercentages: boolean;
  hasSyntheticLining: boolean;
  /** "Silk — percentage not provided" or "100% Silk; lining: 100% Polyester" */
  headline: string;
  /** "Material: …" */
  materialLine: string;
};

function fiberKey(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/spandex/g, "elastane")
    .replace(/flax/g, "linen")
    .replace(/merino/g, "wool")
    .replace(/[^a-z0-9]+/g, "");
}

function titleFiber(raw: string): string {
  const t = String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bspandex\b/i, "elastane")
    .replace(/\bflax\b/i, "linen");
  if (!t) return "";
  const source = t === t.toUpperCase() || t === t.toLowerCase() ? t.toLowerCase() : t;
  return source.replace(/(^|[\s/-])([a-z])/g, (_, prefix: string, ch: string) => prefix + ch.toUpperCase());
}

export function splitShellAndLining(raw: string): { shell: string; lining: string | null } {
  const t = String(raw || "").replace(/\s+/g, " ").trim();
  if (!t) return { shell: "", lining: null };
  const labeled = t.match(/^(.*?)(?:\s*[;,/|]\s*|\s+)\blining\b\s*[:–-]?\s*(.+)$/i);
  if (labeled && labeled[1].trim() && labeled[2].trim()) {
    return {
      shell: labeled[1].replace(/[;,/|]+$/g, "").trim(),
      lining: labeled[2].replace(/\blining\b/gi, "").trim(),
    };
  }
  const trailing = t.match(/^(.*?)\s*[;,/]\s*(.+?)\s+lining\b/i);
  if (trailing && trailing[1].trim() && trailing[2].trim()) {
    return { shell: trailing[1].trim(), lining: trailing[2].trim() };
  }
  return { shell: t, lining: null };
}

function uniquePercentClauses(text: string): string[] {
  const hits = [...String(text || "").matchAll(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:organic\s+|recycled\s+)?([a-z][a-z\s-]{1,30})/gi)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of hits) {
    const pct = m[1];
    const name = titleFiber(m[2] || "");
    const key = fiberKey(m[2] || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(`${pct}% ${name}`);
  }
  return out;
}

function uniqueNamedFibers(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const re = new RegExp(FIBER_CAPTURE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text || "")))) {
    const name = titleFiber(m[2] || m[0] || "");
    const key = fiberKey(m[2] || m[0] || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function formatPart(text: string): { line: string; fibers: string[]; hasPercentages: boolean } {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return { line: "", fibers: [], hasPercentages: false };
  const percents = uniquePercentClauses(t);
  if (percents.length) {
    const fibers = percents.map((p) => p.replace(/^\d+(?:\.\d+)?%\s*/, ""));
    return { line: percents.join(COMPOSITION_JOIN), fibers, hasPercentages: true };
  }
  const fibers = uniqueNamedFibers(t);
  return { line: fibers.join(COMPOSITION_JOIN), fibers, hasPercentages: false };
}

function partHasSynthetic(text: string): boolean {
  const lower = String(text || "").toLowerCase();
  for (const f of SYNTHETIC) {
    if (new RegExp(`\\b${f}\\b`).test(lower)) return true;
  }
  return false;
}

export function isRepeatedFiberDump(raw: string | null | undefined): boolean {
  const t = String(raw || "").replace(/\s+/g, " ").trim();
  if (!t) return false;
  const parts = t.split(/[,;/|]+/).map((p) => fiberKey(p)).filter(Boolean);
  if (parts.length < 3) return false;
  return new Set(parts).size === 1;
}

export function formatCompositionDisplay(raw: string | null | undefined): CompositionDisplay {
  const empty: CompositionDisplay = {
    fibers: [],
    shellLine: "",
    liningLine: null,
    hasPercentages: false,
    hasSyntheticLining: false,
    headline: "Material details unavailable",
    materialLine: "Material details unavailable",
  };
  const stripped = String(raw || "")
    .replace(/^\s*retailer lists:\s*/i, "")
    .replace(/^\s*material:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return empty;

  const { shell, lining } = splitShellAndLining(stripped);
  const shellFmt = formatPart(shell);
  const liningFmt = lining ? formatPart(lining) : { line: "", fibers: [], hasPercentages: false };
  const hasSyntheticLining = Boolean(lining && partHasSynthetic(lining));

  let core = shellFmt.line;
  if (core && !shellFmt.hasPercentages) {
    core = `${core} — ${PERCENTAGE_NOT_PROVIDED}`;
  }
  if (!core) return empty;
  if (liningFmt.line) {
    core = `${core.replace(/ — percentage not provided$/, "")}${COMPOSITION_JOIN}lining: ${liningFmt.line}`;
  }

  return {
    fibers: shellFmt.fibers,
    shellLine: shellFmt.line,
    liningLine: liningFmt.line || null,
    hasPercentages: shellFmt.hasPercentages,
    hasSyntheticLining,
    headline: core,
    materialLine: `Material: ${core}`,
  };
}

/** Short stored composition — unique fibers, semicolon join, no display prefix. */
export function normalizeCompositionStorage(raw: string | null | undefined): string {
  const display = formatCompositionDisplay(raw);
  if (!display.shellLine || display.headline === "Material details unavailable") return "";
  if (display.liningLine) {
    return `${display.shellLine}${COMPOSITION_JOIN}lining: ${display.liningLine}`;
  }
  return display.shellLine;
}

export function compositionHasSyntheticLining(raw: string | null | undefined): boolean {
  return formatCompositionDisplay(raw).hasSyntheticLining;
}
