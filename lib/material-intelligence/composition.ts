const NATURAL = new Set([
  "cotton",
  "linen",
  "flax",
  "silk",
  "wool",
  "merino",
  "cashmere",
  "hemp",
  "alpaca",
  "mohair",
  "leather",
  "suede",
]);

const FIBER_NAMES: Record<string, string> = {
  cotton: "Cotton",
  linen: "Linen",
  flax: "Linen",
  silk: "Silk",
  wool: "Wool",
  merino: "Wool",
  cashmere: "Cashmere",
  hemp: "Hemp",
  alpaca: "Alpaca",
  mohair: "Mohair",
  leather: "Leather",
  suede: "Suede",
  elastane: "Elastane",
  spandex: "Elastane",
  polyester: "Polyester",
  nylon: "Nylon",
  polyamide: "Polyamide",
  viscose: "Viscose",
  rayon: "Rayon",
  acrylic: "Acrylic",
  lyocell: "Lyocell",
  modal: "Modal",
  cupro: "Cupro",
};

export function fiberCode(raw: string): string {
  const t = raw.toLowerCase().trim();
  if (t === "spandex") return "elastane";
  if (t === "flax") return "linen";
  if (t === "merino") return "wool";
  return t.replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "") || "unknown";
}

export function fiberDisplayName(code: string): string {
  return FIBER_NAMES[code] || code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isNaturalFiber(code: string): boolean {
  return NATURAL.has(code);
}

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
  breakdown?: Array<{ fiber?: string; name?: string; percent?: number; percentage?: number }> | null
): ParsedComposition {
  if (Array.isArray(breakdown) && breakdown.length) {
    const components = breakdown
      .map((row) => {
        const name = String(row.fiber || row.name || "").trim();
        if (!name) return null;
        const code = fiberCode(name);
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

  const pctHits = [
    ...text.matchAll(
      /(\d{1,3}(?:\.\d+)?)\s*%\s*(?:organic\s+|recycled\s+)?([a-z][a-z\s-]{1,40})/gi
    ),
  ];
  if (pctHits.length) {
    const components = pctHits.map((m) => {
      const percentage = Number(m[1]);
      const code = fiberCode(m[2]);
      return {
        fiber_code: code,
        fiber_name: fiberDisplayName(code),
        percentage: Number.isFinite(percentage) ? percentage : null,
        raw_value: m[0].trim(),
      };
    });
    return finalize(components, text);
  }

  const named = text.match(
    /\b(cotton|linen|silk|wool|cashmere|hemp|leather|elastane|polyester|nylon|viscose|rayon)\b/i
  );
  if (named) {
    const code = fiberCode(named[1]);
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
  const natural_fiber_percentage = withPct.length ? Math.round(natural * 10) / 10 : null;
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
