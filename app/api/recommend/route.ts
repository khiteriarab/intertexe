import { NextRequest, NextResponse } from "next/server";

const PERSONAS: Record<string, any> = {
  purist: {
    id: "purist", name: "The Purist", coreValue: "Material integrity above all",
    description: "You believe in the absolute purity of natural fibers. No compromises, no blends, no synthetic shortcuts.",
    buysFor: "Quality that lasts decades, not seasons",
    suggestedDesignerTypes: ["Heritage luxury houses", "Artisanal brands", "Japanese minimalism"],
    recommendedMaterials: ["100% cashmere", "Virgin wool", "Mulberry silk", "Egyptian cotton", "European linen"],
  },
  romantic: {
    id: "romantic", name: "The Refined Romantic", coreValue: "Beauty through natural luxury",
    description: "You gravitate toward the most beautiful natural fabrics — silk charmeuse, fine cashmere, delicate linen.",
    buysFor: "The sensory experience of wearing beautiful fabrics",
    suggestedDesignerTypes: ["Modern luxury brands", "Silk specialists", "European ateliers"],
    recommendedMaterials: ["Silk charmeuse", "Cashmere", "Fine merino wool", "Cotton voile", "Silk crepe de chine"],
  },
  pragmatist: {
    id: "pragmatist", name: "The Conscious Pragmatist", coreValue: "Smart choices, real fibers",
    description: "You want natural fibers but you're practical about it. You'll accept a blend if the dominant fiber is natural.",
    buysFor: "Versatile pieces that work harder in your wardrobe",
    suggestedDesignerTypes: ["Scandinavian minimalism", "Conscious luxury", "Modern essentials"],
    recommendedMaterials: ["Cotton", "Linen", "Wool blends (70%+)", "Cotton-linen blends", "Merino wool"],
  },
  explorer: {
    id: "explorer", name: "The Textile Explorer", coreValue: "Discovery and craftsmanship",
    description: "You love learning about fabrics and discovering new materials. You appreciate the story behind each fiber.",
    buysFor: "Unique pieces with interesting material stories",
    suggestedDesignerTypes: ["Artisanal brands", "Emerging designers", "Sustainability pioneers"],
    recommendedMaterials: ["Organic cotton", "Peace silk", "Recycled wool", "Hemp", "Tencel (lyocell)"],
  },
  minimalist: {
    id: "minimalist", name: "The Essential Minimalist", coreValue: "Less but better",
    description: "You curate a small wardrobe of exceptional pieces. Every item must earn its place through quality materials.",
    buysFor: "Timeless pieces in the finest natural fibers",
    suggestedDesignerTypes: ["The Row", "Totême", "Jil Sander school of design"],
    recommendedMaterials: ["Cashmere", "Virgin wool", "Silk", "Premium cotton", "Japanese denim"],
  },
};

function assignPersona(prefs: { materials?: string[]; syntheticTolerance?: string; priceRange?: string }) {
  const mats = (prefs.materials || []).map(m => m.toLowerCase());
  const tolerance = (prefs.syntheticTolerance || "").toLowerCase();
  if (tolerance.includes("never") || tolerance.includes("no synthetic")) return PERSONAS.purist;
  if (mats.includes("silk") || mats.includes("cashmere")) return PERSONAS.romantic;
  if (mats.includes("hemp") || mats.includes("organic")) return PERSONAS.explorer;
  if (tolerance.includes("depends") || tolerance.includes("sometimes")) return PERSONAS.pragmatist;
  return PERSONAS.minimalist;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materials, priceRange, syntheticTolerance } = body;

    const persona = assignPersona({ materials, syntheticTolerance, priceRange });

    return NextResponse.json({
      profileType: persona.name,
      personaId: persona.id,
      recommendation: persona.description,
      coreValue: persona.coreValue,
      buysFor: persona.buysFor,
      suggestedDesignerTypes: persona.suggestedDesignerTypes,
      recommendedMaterials: persona.recommendedMaterials,
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate recommendation" }, { status: 500 });
  }
}
