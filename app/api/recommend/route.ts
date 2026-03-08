import { NextRequest, NextResponse } from "next/server";
import { assignPersona } from "../../../shared/personas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materials, priceRange, syntheticTolerance } = body;

    const persona = assignPersona({
      materials: materials || [],
      syntheticTolerance: syntheticTolerance || "",
      priceRange,
    });

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
