import { NextResponse } from "next/server";
import { providerSummaries } from "../../../../lib/resale/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ providers: providerSummaries() });
}
