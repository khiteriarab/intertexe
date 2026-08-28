/**
 * INTERTEXE material ontology v1 — deterministic, versioned, not LLM-authored.
 * Shop merchandising taxonomy (`lib/catalog-material-taxonomy.ts`) is a separate
 * consumer catalog. Do not merge the two.
 */

export const ITX_ONTOLOGY_VERSION = "itx-ontology.v1";

export type OriginClass = "natural" | "regenerated" | "synthetic" | "other";
export type MaterialKind = "fiber" | "material" | "construction" | "family";

export type MaterialTerm = {
  code: string;
  canonicalName: string;
  family: string;
  parentCode: string | null;
  kind: MaterialKind;
  originClass: OriginClass;
  aliases: string[];
};

/**
 * Approved v1 terms. Nylon stays a distinct fibre in the polyamide family
 * (PA → polyamide, not nylon). Do not edit this array in place for published
 * passports — mint itx-ontology.v2 instead.
 */
export const ITX_ONTOLOGY_V1_TERMS: MaterialTerm[] = [
  {
    code: "cotton",
    canonicalName: "Cotton",
    family: "cotton",
    parentCode: null,
    kind: "fiber",
    originClass: "natural",
    aliases: ["cotton", "co"],
  },
  {
    code: "linen",
    canonicalName: "Linen",
    family: "linen",
    parentCode: null,
    kind: "fiber",
    originClass: "natural",
    aliases: ["linen", "li", "flax"],
  },
  {
    code: "silk",
    canonicalName: "Silk",
    family: "silk",
    parentCode: null,
    kind: "fiber",
    originClass: "natural",
    aliases: ["silk", "se"],
  },
  {
    code: "wool",
    canonicalName: "Wool",
    family: "wool",
    parentCode: null,
    kind: "fiber",
    originClass: "natural",
    aliases: ["wool", "wo", "merino"],
  },
  {
    code: "cashmere",
    canonicalName: "Cashmere",
    family: "wool",
    parentCode: "wool",
    kind: "fiber",
    originClass: "natural",
    aliases: ["cashmere", "ws"],
  },
  {
    code: "mohair",
    canonicalName: "Mohair",
    family: "wool",
    parentCode: "wool",
    kind: "fiber",
    originClass: "natural",
    aliases: ["mohair", "wm"],
  },
  {
    code: "hemp",
    canonicalName: "Hemp",
    family: "hemp",
    parentCode: null,
    kind: "fiber",
    originClass: "natural",
    aliases: ["hemp", "he", "ha"],
  },
  {
    code: "alpaca",
    canonicalName: "Alpaca",
    family: "wool",
    parentCode: "wool",
    kind: "fiber",
    originClass: "natural",
    aliases: ["alpaca"],
  },
  {
    code: "leather",
    canonicalName: "Leather",
    family: "leather",
    parentCode: null,
    kind: "material",
    originClass: "natural",
    aliases: ["leather"],
  },
  {
    code: "suede",
    canonicalName: "Suede",
    family: "leather",
    parentCode: "leather",
    kind: "material",
    originClass: "natural",
    aliases: ["suede"],
  },
  {
    code: "polyamide",
    canonicalName: "Polyamide",
    family: "polyamide",
    parentCode: null,
    kind: "fiber",
    originClass: "synthetic",
    aliases: ["polyamide", "pa"],
  },
  {
    code: "nylon",
    canonicalName: "Nylon",
    family: "polyamide",
    parentCode: "polyamide",
    kind: "fiber",
    originClass: "synthetic",
    aliases: ["nylon"],
  },
  {
    code: "polyester",
    canonicalName: "Polyester",
    family: "polyester",
    parentCode: null,
    kind: "fiber",
    originClass: "synthetic",
    aliases: ["polyester", "pes", "pet"],
  },
  {
    code: "elastane",
    canonicalName: "Elastane",
    family: "elastane",
    parentCode: null,
    kind: "fiber",
    originClass: "synthetic",
    aliases: ["elastane", "ea", "el", "spandex", "lycra"],
  },
  {
    code: "acrylic",
    canonicalName: "Acrylic",
    family: "acrylic",
    parentCode: null,
    kind: "fiber",
    originClass: "synthetic",
    aliases: ["acrylic", "pc"],
  },
  {
    code: "viscose",
    canonicalName: "Viscose",
    family: "viscose",
    parentCode: null,
    kind: "fiber",
    originClass: "regenerated",
    aliases: ["viscose", "cv"],
  },
  {
    code: "rayon",
    canonicalName: "Rayon",
    family: "viscose",
    parentCode: "viscose",
    kind: "fiber",
    originClass: "regenerated",
    aliases: ["rayon"],
  },
  {
    code: "lyocell",
    canonicalName: "Lyocell",
    family: "lyocell",
    parentCode: null,
    kind: "fiber",
    originClass: "regenerated",
    aliases: ["lyocell", "cly", "tencel"],
  },
  {
    code: "modal",
    canonicalName: "Modal",
    family: "modal",
    parentCode: null,
    kind: "fiber",
    originClass: "regenerated",
    aliases: ["modal", "cmd"],
  },
  {
    code: "cupro",
    canonicalName: "Cupro",
    family: "cupro",
    parentCode: null,
    kind: "fiber",
    originClass: "regenerated",
    aliases: ["cupro", "cu"],
  },
];

const TERMS_BY_CODE = new Map(ITX_ONTOLOGY_V1_TERMS.map((term) => [term.code, term]));

const ALIAS_TO_CODE = new Map<string, string>();
for (const term of ITX_ONTOLOGY_V1_TERMS) {
  ALIAS_TO_CODE.set(term.code, term.code);
  for (const alias of term.aliases) {
    ALIAS_TO_CODE.set(normalizeAliasKey(alias), term.code);
  }
}

export function normalizeAliasKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function tokenLookupKeys(raw: string): string[] {
  const lower = raw.toLowerCase().trim();
  const spaced = normalizeAliasKey(raw);
  const compact = spaced.replace(/\s+/g, "");
  return Array.from(new Set([lower, spaced, compact].filter(Boolean)));
}

export function getMaterialTerm(code: string | null | undefined): MaterialTerm | null {
  if (!code) return null;
  return TERMS_BY_CODE.get(code) || TERMS_BY_CODE.get(normalizeAliasKey(code)) || null;
}

export function isKnownMaterialCode(code: string | null | undefined): boolean {
  return Boolean(getMaterialTerm(code));
}

export function resolveMaterialToken(
  raw: string,
  orgAliases?: Record<string, string> | null
): MaterialTerm | null {
  for (const key of tokenLookupKeys(raw)) {
    const orgCode = orgAliases?.[key] || orgAliases?.[key.replace(/\s+/g, "")];
    if (orgCode) return getMaterialTerm(orgCode) || { ...fallbackTerm(orgCode), code: orgCode };
  }
  for (const key of tokenLookupKeys(raw)) {
    const code = ALIAS_TO_CODE.get(key);
    if (code) return getMaterialTerm(code);
  }
  return null;
}

function fallbackTerm(code: string): MaterialTerm {
  return {
    code,
    canonicalName: code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    family: code,
    parentCode: null,
    kind: "fiber",
    originClass: "other",
    aliases: [code],
  };
}

export function materialAliasPattern(): string {
  const aliases = Array.from(ALIAS_TO_CODE.keys())
    .filter((alias) => alias.length >= 2)
    .sort((a, b) => b.length - a.length)
    .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return aliases.join("|");
}
