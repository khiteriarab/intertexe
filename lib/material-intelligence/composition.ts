import { formatCompositionDisplay, splitShellAndLining } from "../composition-display";
import {
  getMaterialTerm,
  isKnownMaterialCode,
  materialAliasPattern,
  resolveMaterialToken,
} from "../enterprise/ontology";

const NAMED_ALIAS_RE = new RegExp(`\\b(${materialAliasPattern()})\\b`, "i");

export function fiberCode(raw: string, orgAliases?: Record<string, string> | null): string {
  const term = resolveMaterialToken(raw, orgAliases);
  if (term) return term.code;
  const t = raw.toLowerCase().trim();
  return t.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unknown";
}

export function fiberDisplayName(code: string): string {
  const term = getMaterialTerm(code);
  if (term) return term.canonicalName;
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isNaturalFiber(code: string): boolean {
  return getMaterialTerm(code)?.originClass === "natural";
}

export { isKnownMaterialCode };

export type ParsedComposition = {
  components: Array<{
    fiber_code: string;
    fiber_name: string;
    percentage: number | null;
    raw_value: string | null;
  }>;
  primary_fiber: string | null;
  natural_fiber_percentage: number | null;
  total_percentage: number | null;
  normalization_warnings: string[];
};

function emptyComposition(warning?: string): ParsedComposition {
  return {
    components: [],
    primary_fiber: null,
    natural_fiber_percentage: null,
    total_percentage: null,
    normalization_warnings: warning ? [warning] : [],
  };
}

/**
 * Parse listed composition. Never invents a percentage to force a 100% total.
 */
export function parseCompositionText(
  raw: string | null | undefined,
  breakdown?: Array<{ fiber?: string; name?: string; percent?: number; percentage?: number }> | null,
  orgAliases?: Record<string, string> | null
): ParsedComposition {
  if (Array.isArray(breakdown) && breakdown.length) {
    const components = breakdown
      .map((row) => {
        const name = String(row.fiber || row.name || "").trim();
        if (!name) return null;
        const code = fiberCode(name, orgAliases);
        const pctRaw = row.percent ?? row.percentage;
        const percentage =
          typeof pctRaw === "number" && Number.isFinite(pctRaw) ? Math.round(pctRaw * 10) / 10 : null;
        return {
          fiber_code: code,
          fiber_name: fiberDisplayName(code),
          percentage,
          raw_value: percentage != null ? `${percentage}% ${fiberDisplayName(code)}` : name,
        };
      })
      .filter(Boolean) as ParsedComposition["components"];
    return finalize(components, raw);
  }

  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return emptyComposition();

  const display = formatCompositionDisplay(text);
  const split = splitShellAndLining(text);
  const shellText = split.shell || text;

  const pctHits = [
    ...shellText.matchAll(
      /(\d{1,3}(?:[.,]\d+)?)\s*%\s*(?:organic\s+|recycled\s+)?([a-z][a-z\s-]{1,40})/gi
    ),
  ];
  if (pctHits.length) {
    const components = pctHits.map((m) => {
      const percentage = Number(String(m[1] || "").replace(",", "."));
      const code = fiberCode(m[2], orgAliases);
      return {
        fiber_code: code,
        fiber_name: fiberDisplayName(code),
        percentage: Number.isFinite(percentage) ? percentage : null,
        raw_value: m[0].trim(),
      };
    });
    return finalize(components, text, constructionWarnings(display));
  }

  const listed = text
    .split(/[/;,]/)
    .map((part) => part.replace(/\d{1,3}(?:[.,]\d+)?\s*%/g, "").trim())
    .filter(Boolean);
  const listedResolved = listed
    .map((part) => {
      const token = part.replace(/^(?:organic|recycled)\s+/i, "").trim();
      const code = fiberCode(token, orgAliases);
      if (!resolveMaterialToken(token, orgAliases) && !isKnownMaterialCode(code)) return null;
      return {
        fiber_code: code,
        fiber_name: fiberDisplayName(code),
        percentage: null as number | null,
        raw_value: part,
      };
    })
    .filter(Boolean) as ParsedComposition["components"];
  if (listedResolved.length >= 2 || (listedResolved.length === 1 && listed.length === 1)) {
    return finalize(listedResolved, text, [
      "Percentage not listed on the source record; no percentage was inferred.",
    ]);
  }

  const named = text.match(NAMED_ALIAS_RE);
  if (named) {
    const code = fiberCode(named[1], orgAliases);
    return finalize(
      [
        {
          fiber_code: code,
          fiber_name: fiberDisplayName(code),
          percentage: null,
          raw_value: text.slice(0, 80),
        },
      ],
      text,
      ["Percentage not listed on the source record; no percentage was inferred."]
    );
  }

  return emptyComposition("Composition text could not be normalized.");
}

function constructionWarnings(display: { laceLine: string | null; liningLine: string | null }): string[] {
  const notes: string[] = [];
  if (display.laceLine) {
    notes.push("Lace was listed as a separate construction; it was not added into the shell total.");
  }
  if (display.liningLine) {
    notes.push("Lining was listed as a separate construction; it was not added into the shell total.");
  }
  return notes;
}

function finalize(
  components: ParsedComposition["components"],
  raw?: string | null,
  extraWarnings: string[] = []
): ParsedComposition {
  const warnings = [...extraWarnings];
  const withPct = components.filter((c) => c.percentage != null);
  const total = withPct.reduce((sum, c) => sum + (c.percentage || 0), 0);
  const total_percentage = withPct.length ? Math.round(total * 10) / 10 : null;
  if (total_percentage != null && Math.abs(total_percentage - 100) > 0.5) {
    warnings.push("Listed percentages do not total 100; the remainder was not invented.");
  }
  const natural = withPct
    .filter((c) => isNaturalFiber(c.fiber_code))
    .reduce((sum, c) => sum + (c.percentage || 0), 0);
  let natural_fiber_percentage = withPct.length ? Math.round(natural * 10) / 10 : null;
  if (natural_fiber_percentage != null && natural_fiber_percentage > 100) {
    warnings.push("Natural-fiber share over 100 was not shown; garment parts were not added together.");
    const hundred = withPct.filter((c) => (c.percentage || 0) >= 98);
    natural_fiber_percentage = hundred.some((c) => isNaturalFiber(c.fiber_code)) ? 100 : null;
  }
  const primary =
    [...components].sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0]?.fiber_code || null;
  return {
    components,
    primary_fiber: primary,
    natural_fiber_percentage,
    total_percentage,
    normalization_warnings: warnings,
  };
}
