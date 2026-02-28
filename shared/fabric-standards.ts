export const NATURAL_FIBERS = [
  "cotton",
  "organic cotton",
  "pima cotton",
  "supima cotton",
  "egyptian cotton",
  "silk",
  "mulberry silk",
  "linen",
  "flax",
  "wool",
  "merino wool",
  "cashmere",
  "mohair",
  "alpaca",
  "camel hair",
  "angora",
  "hemp",
  "jute",
  "ramie",
  "bamboo",
  "kapok",
  "leather",
  "suede",
  "shearling",
] as const;

export const SEMI_SYNTHETIC_FIBERS = [
  "tencel",
  "lyocell",
  "modal",
  "viscose",
  "rayon",
  "cupro",
  "acetate",
  "triacetate",
  "bamboo viscose",
] as const;

export const BANNED_FIBERS = [
  "polyester",
  "nylon",
  "acrylic",
  "polypropylene",
  "polyamide",
  "polyurethane",
  "pvc",
  "vinyl",
  "spandex",
  "elastane",
  "lycra",
  "microfiber",
  "pleather",
  "faux leather",
] as const;

export const LINING_EXCEPTION_FIBERS = [
  "polyester",
  "nylon",
  "polyamide",
] as const;

export const MAX_LINING_SYNTHETIC_PERCENT = 15;
export const MIN_NATURAL_FIBER_PERCENT = 70;

export type FiberCategory = "natural" | "semi-synthetic" | "banned";

export interface FabricComposition {
  fiber: string;
  percent: number;
  isLining?: boolean;
}

export interface ProductFabricData {
  compositions: FabricComposition[];
  productName?: string;
}

export interface FabricEvaluation {
  approved: boolean;
  naturalPercent: number;
  syntheticPercent: number;
  reasons: string[];
}

export function classifyFiber(fiber: string): FiberCategory {
  const normalized = fiber.toLowerCase().trim();
  if (NATURAL_FIBERS.some((f) => normalized.includes(f))) return "natural";
  if (SEMI_SYNTHETIC_FIBERS.some((f) => normalized.includes(f)))
    return "semi-synthetic";
  return "banned";
}

export function evaluateProduct(product: ProductFabricData): FabricEvaluation {
  const reasons: string[] = [];

  const mainCompositions = product.compositions.filter((c) => !c.isLining);
  const liningCompositions = product.compositions.filter((c) => c.isLining);

  let naturalPercent = 0;
  let semiSyntheticPercent = 0;
  let bannedPercent = 0;

  for (const comp of mainCompositions) {
    const category = classifyFiber(comp.fiber);
    if (category === "natural") {
      naturalPercent += comp.percent;
    } else if (category === "semi-synthetic") {
      semiSyntheticPercent += comp.percent;
    } else {
      bannedPercent += comp.percent;
      reasons.push(
        `Contains ${comp.percent}% ${comp.fiber} in main fabric (banned)`,
      );
    }
  }

  if (bannedPercent > 0) {
    return {
      approved: false,
      naturalPercent,
      syntheticPercent: bannedPercent + semiSyntheticPercent,
      reasons,
    };
  }

  if (naturalPercent + semiSyntheticPercent < MIN_NATURAL_FIBER_PERCENT) {
    reasons.push(
      `Natural + semi-synthetic fiber content is ${naturalPercent + semiSyntheticPercent}% (minimum ${MIN_NATURAL_FIBER_PERCENT}%)`,
    );
    return {
      approved: false,
      naturalPercent,
      syntheticPercent: bannedPercent + semiSyntheticPercent,
      reasons,
    };
  }

  let liningBannedPercent = 0;
  for (const comp of liningCompositions) {
    const normalized = comp.fiber.toLowerCase().trim();
    const isLiningException = LINING_EXCEPTION_FIBERS.some((f) =>
      normalized.includes(f),
    );

    if (isLiningException) {
      liningBannedPercent += comp.percent;
    } else {
      const category = classifyFiber(comp.fiber);
      if (category === "banned") {
        reasons.push(
          `Lining contains ${comp.percent}% ${comp.fiber} (not allowed even in lining)`,
        );
        return {
          approved: false,
          naturalPercent,
          syntheticPercent: bannedPercent + liningBannedPercent,
          reasons,
        };
      }
    }
  }

  if (liningBannedPercent > MAX_LINING_SYNTHETIC_PERCENT) {
    reasons.push(
      `Lining synthetic content is ${liningBannedPercent}% (maximum ${MAX_LINING_SYNTHETIC_PERCENT}%)`,
    );
    return {
      approved: false,
      naturalPercent,
      syntheticPercent: bannedPercent + liningBannedPercent,
      reasons,
    };
  }

  if (liningBannedPercent > 0) {
    reasons.push(
      `Lining contains ${liningBannedPercent}% synthetic (within ${MAX_LINING_SYNTHETIC_PERCENT}% tolerance)`,
    );
  }

  return {
    approved: true,
    naturalPercent,
    syntheticPercent: bannedPercent + semiSyntheticPercent + liningBannedPercent,
    reasons:
      reasons.length > 0 ? reasons : ["Meets INTERTEXE fabric standards"],
  };
}

export function parseFabricString(fabricString: string): FabricComposition[] {
  const compositions: FabricComposition[] = [];
  const parts = fabricString.split(/[,;]/);

  for (const part of parts) {
    const match = part.trim().match(/(\d+(?:\.\d+)?)\s*%?\s*(.+)/);
    if (match) {
      compositions.push({
        fiber: match[2].trim(),
        percent: parseFloat(match[1]),
        isLining: false,
      });
      continue;
    }

    const reverseMatch = part.trim().match(/(.+?)\s+(\d+(?:\.\d+)?)\s*%/);
    if (reverseMatch) {
      compositions.push({
        fiber: reverseMatch[1].trim(),
        percent: parseFloat(reverseMatch[2]),
        isLining: false,
      });
    }
  }

  return compositions;
}
