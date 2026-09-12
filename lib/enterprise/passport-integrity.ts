/**
 * Passport data integrity — blocks resale when governed fields conflict.
 * Customer Zero fixtures are the canonical reference for pilot products.
 */
import { parseCompositionText } from "../material-intelligence/composition";
import { pilotCatalog, resolvePilotFixture, type PilotFixtureRow } from "./pilot-product-media";

export type IntegrityStatus = "valid" | "data_conflict" | "illustrative_only" | "incomplete";

export type IntegrityCheck = {
  code: string;
  severity: "error" | "warn";
  message: string;
};

export type PassportIntegrityResult = {
  status: IntegrityStatus;
  resaleEligible: boolean;
  checks: IntegrityCheck[];
  styleCode: string | null;
  sku: string | null;
};

const ILLUSTRATIVE_MARKERS = [/mulberry silk/i, /silk reeling/i, /silk satin/i, /evening dress assembly/i, /silk spinning/i];

const FIBER_PATTERN = /silk|linen|cotton|wool|cashmere|polyester|elastane|nylon/gi;

function fibersFromComposition(text: string | null | undefined): string[] {
  if (!text) return [];
  const parsed = parseCompositionText(text);
  if (parsed.components.length) {
    return parsed.components.map((c) => (c.fiber_name || c.fiber_code).toLowerCase());
  }
  return text.toLowerCase().match(FIBER_PATTERN) || [];
}

/** Keyword scan for supply-chain / journey prose — never use composition parser here. */
function fibersFromProse(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.toLowerCase().match(FIBER_PATTERN) || [];
}

function fibersConflict(a: string[], b: string[]): boolean {
  const primaryA = new Set(a.filter((f) => !/elastane|spandex|polyester/.test(f)));
  const primaryB = new Set(b.filter((f) => !/elastane|spandex|polyester/.test(f)));
  if (!primaryA.size || !primaryB.size) return false;
  for (const f of primaryA) {
    if (primaryB.has(f)) return false;
  }
  return true;
}

export function auditPassportIntegrity(input: {
  styleCode?: string | null;
  sku?: string | null;
  productName?: string | null;
  brand?: string | null;
  category?: string | null;
  composition?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  traceNodes?: Array<{ tier_label?: string | null; facility_name?: string | null; country_code?: string | null }>;
  journeyStages?: Array<{ eyebrow?: string; title?: string; detail?: string | null }>;
  careInstructions?: string | null;
  dataSource?: "published" | "preview" | "fixture";
}): PassportIntegrityResult {
  const fixture = resolvePilotFixture(input.sku, input.styleCode);
  const checks: IntegrityCheck[] = [];

  if (!input.composition) {
    checks.push({ code: "missing_composition", severity: "error", message: "Composition is missing." });
  }
  if (!input.productName) {
    checks.push({ code: "missing_name", severity: "error", message: "Product name is missing." });
  }
  if (!input.imageUrl && !fixture?.image_url) {
    checks.push({ code: "missing_image", severity: "warn", message: "Product image is missing." });
  }

  if (fixture) {
    if (input.productName && !namesAlign(input.productName, fixture.name)) {
      checks.push({
        code: "name_fixture_mismatch",
        severity: "error",
        message: `Product name "${input.productName}" does not match fixture "${fixture.name}".`,
      });
    }
    if (input.brand && fixture.brand && !brandsAlign(input.brand, fixture.brand)) {
      checks.push({
        code: "brand_fixture_mismatch",
        severity: "error",
        message: `Brand "${input.brand}" does not match fixture "${fixture.brand}".`,
      });
    }
    if (input.composition && fixture.composition && !compositionsAlign(input.composition, fixture.composition)) {
      checks.push({
        code: "composition_fixture_mismatch",
        severity: "error",
        message: `Composition "${input.composition}" conflicts with fixture "${fixture.composition}".`,
      });
    }
    if (input.category && fixture.category && !categoriesAlign(input.category, fixture.category)) {
      checks.push({
        code: "category_fixture_mismatch",
        severity: "error",
        message: `Category "${input.category}" conflicts with fixture "${fixture.category}".`,
      });
    }
  }

  const compFibers = fibersFromComposition(input.composition);
  const journeyText = (input.journeyStages || [])
    .filter((s) => (s as { id?: string }).id !== "product" && (s as { id?: string }).id !== "next-life")
    .map((s) => `${s.detail || ""} ${s.eyebrow || ""}`)
    .join(" ");
  const traceText = (input.traceNodes || [])
    .map((n) => `${n.facility_name || ""} ${n.tier_label || ""}`)
    .join(" ");

  if (fibersConflict(compFibers, fibersFromProse(journeyText))) {
    checks.push({
      code: "journey_composition_conflict",
      severity: "error",
      message: "Product journey references materials that conflict with stated composition.",
    });
  }
  if (fibersConflict(compFibers, fibersFromProse(traceText))) {
    checks.push({
      code: "trace_composition_conflict",
      severity: "error",
      message: "Supply chain trace references materials that conflict with stated composition.",
    });
  }

  for (const marker of ILLUSTRATIVE_MARKERS) {
    if (marker.test(journeyText) || marker.test(traceText)) {
      if (compFibers.some((f) => f.includes("linen") || f.includes("cotton") || f.includes("wool"))) {
        checks.push({
          code: "illustrative_lifecycle",
          severity: "error",
          message: "Illustrative silk/demo lifecycle data is presented alongside non-silk product composition.",
        });
        break;
      }
    }
  }

  if (/dress/i.test(input.productName || "") && /shirt|skirt|pants|beanie|sweater|knitwear/i.test(fixture?.category || input.category || "")) {
    checks.push({
      code: "name_category_conflict",
      severity: "error",
      message: "Product name and category describe different garment types.",
    });
  }

  const hasError = checks.some((c) => c.severity === "error");
  const illustrative = checks.some((c) => c.code === "illustrative_lifecycle");
  const incomplete = checks.some((c) => c.code.startsWith("missing_"));

  let status: IntegrityStatus = "valid";
  if (illustrative) status = "illustrative_only";
  else if (hasError) status = "data_conflict";
  else if (incomplete) status = "incomplete";

  return {
    status,
    resaleEligible: status === "valid",
    checks,
    styleCode: input.styleCode || fixture?.style || null,
    sku: input.sku || fixture?.sku || null,
  };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function namesAlign(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na.includes(nb.slice(0, 20)) || nb.includes(na.slice(0, 20)) || na === nb;
}

function brandsAlign(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

function compositionsAlign(a: string, b: string): boolean {
  return !fibersConflict(fibersFromComposition(a), fibersFromComposition(b));
}

function categoriesAlign(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (/skirt|miniskirt/.test(na) && /skirt|miniskirt|trousers/.test(nb)) return true;
  if (/shirt/.test(na) && /shirt/.test(nb)) return true;
  return false;
}

/** Audit all Customer Zero fixture products (offline reference). */
export function auditCustomerZeroFixtures(): Array<PassportIntegrityResult & { fixture: PilotFixtureRow }> {
  return pilotCatalog().map((fixture) => ({
    fixture,
    ...auditPassportIntegrity({
      styleCode: fixture.style,
      sku: fixture.sku,
      productName: fixture.name,
      brand: fixture.brand,
      category: fixture.category,
      composition: fixture.composition,
      imageUrl: fixture.image_url,
      dataSource: "fixture",
    }),
  }));
}
