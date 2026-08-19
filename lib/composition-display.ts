import { collectPercentClauses } from "./capture-page-signals";

/**
 * One composition formula for every INTERTEXE surface.
 * Join clauses with "; ". Never print a raw extraction array.
 */

export const COMPOSITION_JOIN = "; ";
export const PERCENTAGE_NOT_PROVIDED = "percentage not provided";

const FIBER_CAPTURE =
  /\b(organic\s+|recycled\s+)?(cotton|algod[oó]n|algodon|denim|vaquero|wool|lana|linen|lino|silk|seda|cashmere|viscose|viscosa|polyester|poli[eé]ster|polyamide|poliamida|nylon|elastane|elastano|spandex|modal|lyocell|tencel|acrylic|rayon|hemp|alpaca|merino|leather|suede|cupro|triacetate|acetate)\b/gi;

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
  laceLine: string | null;
  hasPercentages: boolean;
  hasSyntheticLining: boolean;
  hasSyntheticLace: boolean;
  /** "Silk — percentage not provided" or "100% Silk; lace: 65% Nylon; 35% Cotton" */
  headline: string;
  /** "Material: …" */
  materialLine: string;
};

function fiberKey(raw: string): string {
  return titleFiber(raw)
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
    .replace(/\bflax\b/i, "linen")
    .replace(/\balgod[oó]n\b/gi, "cotton")
    .replace(/\balgodon\b/gi, "cotton")
    .replace(/\bvaquero\b/gi, "cotton")
    .replace(/\bdenim\b/gi, "cotton")
    .replace(/\bseda\b/gi, "silk")
    .replace(/\blana\b/gi, "wool")
    .replace(/\blino\b/gi, "linen")
    .replace(/\belastano\b/gi, "elastane")
    .replace(/\bviscosa\b/gi, "viscose")
    .replace(/\bpoli[eé]ster\b/gi, "polyester")
    .replace(/\bpoliamida\b/gi, "polyamide");
  if (!t) return "";
  const source = t === t.toUpperCase() || t === t.toLowerCase() ? t.toLowerCase() : t;
  return source.replace(/(^|[\s/-])([a-z])/g, (_, prefix: string, ch: string) => prefix + ch.toUpperCase());
}

export function splitShellAndLining(raw: string): { shell: string; lining: string | null; lace: string | null } {
  const t = String(raw || "").replace(/\s+/g, " ").trim();
  if (!t) return { shell: "", lining: null, lace: null };
  let rest = t;
  let lining: string | null = null;
  let lace: string | null = null;
  const laceHit = rest.match(/^(.*?)\s*[;,]\s*lace\s*[:–-]?\s*(.+)$/i);
  if (laceHit?.[1].trim() && laceHit[2].trim()) {
    rest = laceHit[1].replace(/[;,/|]+$/g, "").trim();
    lace = laceHit[2].replace(/\blace\b/gi, "").replace(/^[:–-]\s*/, "").trim();
    const liningInLace = lace.match(/^(.*?)\s*[;,]\s*lining\s*[:–-]?\s*(.+)$/i);
    if (liningInLace?.[1].trim() && liningInLace[2].trim()) {
      lace = liningInLace[1].trim();
      lining = liningInLace[2].replace(/\blining\b/gi, "").trim();
    }
  }
  if (!lining) {
    const labeled = rest.match(/^(.*?)(?:\s*[;,/|]\s*|\s+)\blining\b\s*[:–-]?\s*(.+)$/i);
    if (labeled && labeled[1].trim() && labeled[2].trim()) {
      rest = labeled[1].replace(/[;,/|]+$/g, "").trim();
      lining = labeled[2].replace(/\blining\b/gi, "").trim();
    }
  }
  return { shell: rest, lining, lace };
}

function uniquePercentClauses(text: string): string[] {
  return collectPercentClauses(text);
}

function inferOverflowParts(raw: string): { shell: string; lace: string | null; lining: string | null } | null {
  const clauses = uniquePercentClauses(raw);
  if (clauses.length < 2) return null;
  const parsed = clauses
    .map((line) => {
      const m = line.match(/^(\d+(?:\.\d+)?)%\s+(.+)$/);
      return m ? { pct: Number(m[1]), fiber: m[2], line } : null;
    })
    .filter((row): row is { pct: number; fiber: string; line: string } => Boolean(row && Number.isFinite(row.pct)));
  const total = parsed.reduce((sum, row) => sum + row.pct, 0);
  if (total <= 105) return null;

  const hundreds = parsed.filter((row) => row.pct >= 98);
  if (hundreds.length >= 2) {
    const naturalHundred = hundreds.find((row) => !partHasSynthetic(row.fiber));
    const synthHundred = hundreds.find((row) => partHasSynthetic(row.fiber));
    if (naturalHundred && synthHundred) {
      return { shell: naturalHundred.line, lace: null, lining: synthHundred.line };
    }
  }

  const shellParts = parsed.filter((row) => row.pct >= 98);
  const rest = parsed.filter((row) => row.pct < 98);
  if (!shellParts.length || !rest.length) return null;
  const restTotal = rest.reduce((sum, row) => sum + row.pct, 0);
  if (restTotal < 85 || restTotal > 115) return null;
  const shell = shellParts.map((row) => row.line).join(COMPOSITION_JOIN);
  const restLine = rest.map((row) => row.line).join(COMPOSITION_JOIN);
  const restText = rest.map((row) => row.fiber).join(" ");
  if (partHasSynthetic(restText) && rest.length >= 2) {
    return { shell, lace: restLine, lining: null };
  }
  if (partHasSynthetic(restText)) {
    return { shell, lace: null, lining: restLine };
  }
  return { shell, lace: restLine, lining: null };
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
    laceLine: null,
    hasPercentages: false,
    hasSyntheticLining: false,
    hasSyntheticLace: false,
    headline: "Material details unavailable",
    materialLine: "Material details unavailable",
  };
  const stripped = String(raw || "")
    .replace(/^\s*retailer lists:\s*/i, "")
    .replace(/^\s*material:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return empty;

  let { shell, lining, lace } = splitShellAndLining(stripped);
  if (!lace && !lining) {
    const inferred = inferOverflowParts(stripped);
    if (inferred) {
      shell = inferred.shell;
      lace = inferred.lace;
      lining = inferred.lining;
    }
  }
  const shellFmt = formatPart(shell);
  const liningFmt = lining ? formatPart(lining) : { line: "", fibers: [], hasPercentages: false };
  const laceFmt = lace ? formatPart(lace) : { line: "", fibers: [], hasPercentages: false };
  const hasSyntheticLining = Boolean(lining && partHasSynthetic(lining));
  const hasSyntheticLace = Boolean(lace && partHasSynthetic(lace));

  let core = shellFmt.line;
  if (core && !shellFmt.hasPercentages) {
    core = `${core} — ${PERCENTAGE_NOT_PROVIDED}`;
  }
  if (!core) return empty;
  if (laceFmt.line) {
    core = `${core.replace(/ — percentage not provided$/, "")}${COMPOSITION_JOIN}lace: ${laceFmt.line}`;
  }
  if (liningFmt.line) {
    core = `${core.replace(/ — percentage not provided$/, "")}${COMPOSITION_JOIN}lining: ${liningFmt.line}`;
  }

  return {
    fibers: shellFmt.fibers,
    shellLine: shellFmt.line,
    liningLine: liningFmt.line || null,
    laceLine: laceFmt.line || null,
    hasPercentages: shellFmt.hasPercentages,
    hasSyntheticLining,
    hasSyntheticLace,
    headline: core,
    materialLine: `Material: ${core}`,
  };
}

/** Short stored composition — unique fibers, semicolon join, no display prefix. */
export function normalizeCompositionStorage(raw: string | null | undefined): string {
  const display = formatCompositionDisplay(raw);
  if (!display.shellLine || display.headline === "Material details unavailable") return "";
  if (display.liningLine) {
    return `${display.shellLine}${COMPOSITION_JOIN}${display.laceLine ? `lace: ${display.laceLine}${COMPOSITION_JOIN}` : ""}lining: ${display.liningLine}`;
  }
  if (display.laceLine) {
    return `${display.shellLine}${COMPOSITION_JOIN}lace: ${display.laceLine}`;
  }
  return display.shellLine;
}

export function compositionHasSyntheticLining(raw: string | null | undefined): boolean {
  return formatCompositionDisplay(raw).hasSyntheticLining;
}
