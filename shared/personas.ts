export type FabricPersona = {
  id: string;
  name: string;
  description: string;
  coreValue: string;
  buysFor: string;
  suggestedDesignerTypes: string[];
  recommendedMaterials: string[];
};

export const FABRIC_PERSONAS: FabricPersona[] = [
  {
    id: "silk-purist",
    name: "The Silk Purist",
    description: "You gravitate toward fluid, luminous fabrics that feel effortless against the skin.",
    coreValue: "Natural luxury",
    buysFor: "Occasion pieces and elevated everyday separates",
    suggestedDesignerTypes: ["Occasionwear", "Contemporary luxury"],
    recommendedMaterials: ["Silk", "Cashmere"],
  },
  {
    id: "linen-naturalist",
    name: "The Linen Naturalist",
    description: "Breathable, honest fibers matter more than flash — you dress for climate and ease.",
    coreValue: "Breathability",
    buysFor: "Warm-weather wardrobes and relaxed tailoring",
    suggestedDesignerTypes: ["Resort", "Minimalist"],
    recommendedMaterials: ["Linen", "Cotton"],
  },
  {
    id: "wool-classicist",
    name: "The Wool Classicist",
    description: "Structure, warmth, and longevity define your closet.",
    coreValue: "Durability",
    buysFor: "Coats, knitwear, and year-round staples",
    suggestedDesignerTypes: ["Heritage", "Tailoring"],
    recommendedMaterials: ["Wool", "Cashmere"],
  },
  {
    id: "cotton-essentialist",
    name: "The Cotton Essentialist",
    description: "Clean, wearable naturals — nothing fussy, nothing synthetic-forward.",
    coreValue: "Simplicity",
    buysFor: "Daily uniforms and soft separates",
    suggestedDesignerTypes: ["Contemporary", "Elevated basics"],
    recommendedMaterials: ["Cotton", "Denim"],
  },
  {
    id: "fiber-eclectic",
    name: "The Fiber Eclectic",
    description: "You mix textures and fibers by mood, always anchored in natural materials.",
    coreValue: "Versatility",
    buysFor: "A balanced wardrobe across seasons",
    suggestedDesignerTypes: ["Contemporary", "Designer"],
    recommendedMaterials: ["Silk", "Wool", "Cotton"],
  },
];

type AssignInput = {
  materials?: string[];
  syntheticTolerance?: string;
  priceRange?: string;
};

export function assignPersona(input: AssignInput): FabricPersona {
  const mats = (input.materials ?? []).map((m) => m.toLowerCase());
  if (mats.some((m) => m.includes("silk") || m.includes("satin"))) {
    return FABRIC_PERSONAS.find((p) => p.id === "silk-purist")!;
  }
  if (mats.some((m) => m.includes("linen"))) {
    return FABRIC_PERSONAS.find((p) => p.id === "linen-naturalist")!;
  }
  if (mats.some((m) => m.includes("wool") || m.includes("cashmere"))) {
    return FABRIC_PERSONAS.find((p) => p.id === "wool-classicist")!;
  }
  if (mats.some((m) => m.includes("cotton") || m.includes("denim"))) {
    return FABRIC_PERSONAS.find((p) => p.id === "cotton-essentialist")!;
  }
  return FABRIC_PERSONAS.find((p) => p.id === "fiber-eclectic")!;
}
