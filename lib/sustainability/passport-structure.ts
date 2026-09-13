import type { ConsumerPassportContent } from "../enterprise/public-passport-content";
import { buildCircularity } from "./circularity";
import { buildEnvironmentalImpact } from "./environmental-impact";
import { buildRegulatoryScores } from "./regulatory/france-ecobalyse";
import { buildConsumerSustainabilityProfile } from "./sustainability-profile";
import { buildTraceabilityScore } from "./traceability-score";
import type { ImpactInputRow, IntertexeProductPassport, RegulatoryScoreRow } from "./types";

function naturalFiberShare(composition: string | null): number | null {
  if (!composition) return null;
  const lower = composition.toLowerCase();
  if (/100%\s*(linen|wool|cashmere|silk|cotton)/.test(lower)) return 100;
  if (/linen|wool|cashmere|silk/.test(lower)) return 85;
  if (/cotton/.test(lower) && !/polyester/.test(lower)) return 75;
  if (/polyester|polyamide/.test(lower)) return 30;
  return 55;
}

function parseCertifications(fields: Array<{ key: string; value: string }>): Array<{ name: string; status: "verified" | "declared" }> {
  const raw = fields.find((f) => /certification/i.test(f.key))?.value;
  if (!raw) return [];
  return raw.split(/[,;·]/).map((s) => s.trim()).filter(Boolean).map((name) => ({ name, status: "declared" as const }));
}

/** Build full structured passport — evidence stored once, rendered for any interface. */
type TraceNodeInput = {
  tier: number;
  tier_label?: string | null;
  facility_name?: string | null;
  country_code?: string | null;
  data_status?: string | null;
};

export function buildIntertexeProductPassport(input: {
  consumer: ConsumerPassportContent;
  publicId: string;
  traceNodes?: TraceNodeInput[];
  impactInputs: ImpactInputRow[];
  regulatoryScores: RegulatoryScoreRow[];
  ownershipCount: number;
  evidenceCount?: number;
  lastVerifiedAt?: string | null;
}): IntertexeProductPassport {
  const { consumer, publicId } = input;
  const traceability = buildTraceabilityScore({
    traceNodes: input.traceNodes || [],
    publicFields: consumer.publicFields,
    certificateCount: parseCertifications(consumer.publicFields || []).length,
    evidenceCount: input.evidenceCount,
    lastVerifiedAt: input.lastVerifiedAt,
  });

  const environmentalImpact = buildEnvironmentalImpact({
    impactInputs: input.impactInputs,
    composition: consumer.composition,
    category: consumer.category,
  });

  const regulatoryScores = buildRegulatoryScores(input.regulatoryScores);
  const circularity = buildCircularity({
    resaleEligible: consumer.resaleEligible !== false,
    resaleIntelligence: consumer.resaleIntelligence || null,
    ownershipCount: input.ownershipCount,
    careInstructions: consumer.careInstructions,
    composition: consumer.composition,
    publicId,
  });

  const sustainabilityProfile = buildConsumerSustainabilityProfile({
    traceability,
    environmental: environmentalImpact,
    regulatory: regulatoryScores,
    circularity,
    composition: consumer.composition,
    manufacturingCountry: consumer.manufacturingCountry,
  });

  return {
    product: {
      publicId,
      name: consumer.productName,
      brand: consumer.brand,
      category: consumer.category,
      identifier: consumer.identifier,
      imageUrl: consumer.imageUrl,
      passportStatus: consumer.passportStatus,
    },
    materials: {
      composition: consumer.composition,
      breakdown: consumer.materialBreakdown,
      naturalFiberShare: naturalFiberShare(consumer.composition),
    },
    supplyChain: {
      manufacturingCountry: consumer.manufacturingCountry,
      manufacturer: consumer.manufacturer,
      facility: consumer.facility,
      journeyStages: consumer.journeyStages
        .filter((s) => s.status === "known")
        .map((s) => ({ id: s.id, title: s.title, location: s.location })),
    },
    manufacturing: {
      countries: traceability.countries,
      facilities: traceability.facilities,
    },
    traceability,
    certifications: parseCertifications(consumer.publicFields || []),
    environmentalImpact,
    regulatoryScores,
    circularity,
    resale: {
      eligible: consumer.resaleEligible !== false,
      intelligence: consumer.resaleIntelligence || null,
      sellUrl: consumer.resaleEligible !== false ? `/p/${publicId}/sell` : null,
    },
    lifecycle: {
      events: consumer.lifecycleEvents || [],
      timeline: consumer.timeline,
    },
    sustainabilityProfile,
  };
}
