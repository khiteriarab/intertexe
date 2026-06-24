export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { getServerSupabase } from "../../../../lib/supabase-server";

const MAX_SCANS = 48;

type ScanPayload = {
  scannedAt?: string;
  productId?: string | null;
  imageUrl?: string | null;
  brand?: string | null;
  productName?: string | null;
  composition?: string | null;
  naturalPercent?: number | null;
  verdict?: string | null;
  scanSource?: string | null;
};

/** Merge local scan history into Supabase (mirrors iOS scan_history). */
export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const scans: ScanPayload[] = Array.isArray(body.scans) ? body.scans : [];

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "Database not available" }, { status: 500 });

  const userId = String(user.id);
  for (const scan of scans.slice(0, MAX_SCANS)) {
    const row: Record<string, unknown> = {
      user_id: userId,
      scanned_at: scan.scannedAt || new Date().toISOString(),
      product_id: scan.productId || null,
      image_url: scan.imageUrl || null,
      brand: scan.brand || null,
      product_name: scan.productName || null,
      composition: scan.composition || null,
      natural_percent: scan.naturalPercent ?? null,
      verdict: scan.verdict || null,
      scan_source: scan.scanSource || "manual",
    };
    await supabase.from("scan_history").insert(row);
  }

  return NextResponse.json({ success: true, merged: Math.min(scans.length, MAX_SCANS) });
}

/** Recent scans for account sync (newest first). */
export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ scans: [] }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ scans: [] }, { status: 500 });

  const { data, error } = await supabase
    .from("scan_history")
    .select(
      "id, scanned_at, product_id, image_url, brand, product_name, composition, natural_percent, verdict, scan_source"
    )
    .eq("user_id", String(user.id))
    .order("scanned_at", { ascending: false })
    .limit(MAX_SCANS);

  if (error) return NextResponse.json({ scans: [] }, { status: 500 });
  return NextResponse.json({ scans: data || [] });
}
