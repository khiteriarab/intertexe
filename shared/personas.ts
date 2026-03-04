export interface FabricPersona {
  id: string;
  name: string;
  tagline: string;
  description: string;
  coreValue: string;
  buysFor: string;
  recommendedMaterials: string[];
  suggestedDesignerTypes: string[];
}

export const FABRIC_PERSONAS: FabricPersona[] = [
  {
    id: "the-purist",
    name: "The Purist",
    tagline: "Integrity of material.",
    description: "You are drawn to the essence of what fabric can be at its most honest. Linen, cotton, silk, wool — nothing synthetic unless absolutely forced. You buy for quality, breathability, and long-term wear. You are the intellectual minimalist who reads care labels before price tags.",
    coreValue: "Integrity of material",
    buysFor: "Quality, breathability, long-term wear",
    recommendedMaterials: ["Linen", "Cotton", "Silk", "Wool", "Cashmere"],
    suggestedDesignerTypes: ["Heritage luxury houses", "Japanese artisanal labels", "Scandinavian purists"],
  },
  {
    id: "the-refined-romantic",
    name: "The Refined Romantic",
    tagline: "Sensory elegance.",
    description: "You are moved by the way fabric falls, drapes, and catches light. Silk, satin, softness, femininity — luxury through emotion. You buy for flow, touch, and movement. Every piece you own tells a tactile story.",
    coreValue: "Sensory elegance",
    buysFor: "Flow, touch, movement",
    recommendedMaterials: ["Silk", "Satin", "Cashmere", "Velvet", "Viscose / Rayon"],
    suggestedDesignerTypes: ["Romantic luxury houses", "Silk specialists", "Draped-silhouette designers"],
  },
  {
    id: "the-structured-minimalist",
    name: "The Structured Minimalist",
    tagline: "Architecture of fabric.",
    description: "You think in clean lines, sharp tailoring, and crisp construction. Structured wool blazers, cotton poplin shirts, tailored silhouettes that command a room. You buy for form, shape, and authority. Fabric is your building material.",
    coreValue: "Architecture of fabric",
    buysFor: "Form, shape, authority",
    recommendedMaterials: ["Wool", "Cotton", "Linen", "Denim", "Leather / Suede"],
    suggestedDesignerTypes: ["Modern tailoring houses", "Minimalist design studios", "Architectural fashion labels"],
  },
  {
    id: "the-conscious-curator",
    name: "The Conscious Curator",
    tagline: "Responsibility meets aesthetic.",
    description: "You believe beautiful clothes and ethical production are not mutually exclusive. Organic fibers, responsible sourcing, longevity over trend — you curate a wardrobe that reflects your values without compromising on style.",
    coreValue: "Responsibility + aesthetic",
    buysFor: "Longevity and environmental alignment",
    recommendedMaterials: ["Cotton", "Linen", "Tencel / Modal", "Wool", "Alpaca"],
    suggestedDesignerTypes: ["Certified sustainable brands", "Slow fashion pioneers", "Organic fiber specialists"],
  },
  {
    id: "the-performance-luxe",
    name: "The Performance Luxe",
    tagline: "Function without compromise.",
    description: "You want stretch, durability, and wrinkle-resistance — but still elevated. Travel, work, movement: your wardrobe performs as hard as you do. You accept carefully blended fabrics when the result justifies it, as long as it never looks or feels cheap.",
    coreValue: "Function without looking cheap",
    buysFor: "Travel, work, movement",
    recommendedMaterials: ["Wool", "Cotton", "Tencel / Modal", "Viscose / Rayon", "Silk"],
    suggestedDesignerTypes: ["Performance luxury brands", "Travel-oriented designers", "Technical fabric innovators"],
  },
];

export function assignPersona(quiz: {
  materials: string[];
  syntheticTolerance: string;
  priceRange?: string;
}): FabricPersona {
  const mats = quiz.materials.map(m => m.toLowerCase());
  const tolerance = quiz.syntheticTolerance.toLowerCase();

  const hasSilk = mats.some(m => m.includes("silk") || m.includes("satin"));
  const hasVelvet = mats.includes("velvet");
  const hasDrape = hasSilk || hasVelvet || mats.some(m => m.includes("viscose") || m.includes("rayon"));
  const hasStructure = mats.some(m => m.includes("wool") || m.includes("denim") || m.includes("leather") || m.includes("suede"));
  const hasCotton = mats.some(m => m.includes("cotton"));
  const hasLinen = mats.some(m => m.includes("linen"));
  const hasTencel = mats.some(m => m.includes("tencel") || m.includes("modal"));
  const hasCashmere = mats.some(m => m.includes("cashmere"));
  const hasAlpaca = mats.some(m => m.includes("alpaca"));
  const hasNaturalOnly = mats.every(m =>
    m.includes("cotton") || m.includes("silk") || m.includes("linen") ||
    m.includes("wool") || m.includes("cashmere") || m.includes("leather") ||
    m.includes("suede") || m.includes("alpaca") || m.includes("denim") ||
    m.includes("velvet") || m.includes("satin")
  );

  const noSynthetics = tolerance.includes("none") || tolerance.includes("natural only");
  const lowSynthetics = tolerance.includes("10%");
  const highSynthetics = tolerance.includes("40%") || tolerance.includes("depends");

  let scores = {
    "the-purist": 0,
    "the-refined-romantic": 0,
    "the-structured-minimalist": 0,
    "the-conscious-curator": 0,
    "the-performance-luxe": 0,
  };

  if (noSynthetics) {
    scores["the-purist"] += 4;
    scores["the-conscious-curator"] += 2;
  }
  if (lowSynthetics) {
    scores["the-purist"] += 2;
    scores["the-structured-minimalist"] += 2;
    scores["the-conscious-curator"] += 2;
  }
  if (highSynthetics) {
    scores["the-performance-luxe"] += 4;
  }

  if (hasNaturalOnly && noSynthetics) {
    scores["the-purist"] += 3;
  }

  if (hasDrape && hasSilk) {
    scores["the-refined-romantic"] += 4;
  }
  if (hasSilk && !hasStructure) {
    scores["the-refined-romantic"] += 2;
  }
  if (hasVelvet) {
    scores["the-refined-romantic"] += 2;
  }

  if (hasStructure && (hasCotton || hasLinen)) {
    scores["the-structured-minimalist"] += 3;
  }
  if (hasStructure && !hasDrape) {
    scores["the-structured-minimalist"] += 3;
  }

  if (hasTencel || hasAlpaca) {
    scores["the-conscious-curator"] += 3;
  }
  if (hasCotton && hasLinen && !highSynthetics) {
    scores["the-conscious-curator"] += 2;
  }

  if (highSynthetics && hasStructure) {
    scores["the-performance-luxe"] += 3;
  }
  if (hasTencel && highSynthetics) {
    scores["the-performance-luxe"] += 2;
  }

  if (hasCashmere) {
    scores["the-purist"] += 1;
    scores["the-refined-romantic"] += 1;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topId = sorted[0][0];

  return FABRIC_PERSONAS.find(p => p.id === topId) || FABRIC_PERSONAS[0];
}
