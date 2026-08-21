import { NextResponse } from "next/server";
import { fetchProductById } from "../../../lib/supabase-server";
import { weeklyEditBuyDestination } from "../../../lib/weekly-edit";

export const dynamic = "force-dynamic";

/**
 * Weekly Edit photo taps land here. Not in AASA, so Gmail cannot open Shop.
 * 302 to the retailer/affiliate URL for this exact SKU.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await fetchProductById(id);
  const dest = weeklyEditBuyDestination(id, product?.url);
  return NextResponse.redirect(dest, 302);
}
