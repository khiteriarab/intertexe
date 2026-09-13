import type { ResaleValuation } from "../resale/types";
import type { ProductCircularity } from "./types";

function inferRepairable(careInstructions: string[] | null, composition: string | null): boolean | null {
  const text = [...(careInstructions || []), composition || ""].join(" ").toLowerCase();
  if (/repair|rewear|alteration/.test(text)) return true;
  if (composition && /100%\s*(wool|linen|cashmere|silk|cotton)/.test(composition.toLowerCase())) return true;
  return null;
}

function inferRecyclable(composition: string | null): boolean | null {
  if (!composition) return null;
  const lower = composition.toLowerCase();
  if (/100%\s*(wool|linen|cotton|polyester)/.test(lower)) return true;
  if (/elastane|spandex|mixed/.test(lower)) return false;
  return null;
}

export function buildCircularity(input: {
  resaleEligible: boolean;
  resaleIntelligence: ResaleValuation | null;
  ownershipCount: number;
  careInstructions: string[] | null;
  composition: string | null;
  publicId: string;
}): ProductCircularity {
  const intel = input.resaleIntelligence;
  return {
    repairable: inferRepairable(input.careInstructions, input.composition),
    recyclable: inferRecyclable(input.composition),
    resaleEligible: input.resaleEligible,
    estimatedResaleValue: intel?.estimatedValue ?? null,
    valueRetentionPct: intel?.valueRetentionPct ?? null,
    ownershipCount: input.ownershipCount,
    currency: intel?.currency ?? null,
  };
}
