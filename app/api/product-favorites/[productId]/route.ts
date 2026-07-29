export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { getServerSupabase } from "../../../../lib/supabase-server";
import { clearCuratorEditorPickAfterUnfavorite } from "../../../../lib/editor-pick-sync";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { productId } = await params;
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "Database not available" }, { status: 500 });

  const result = await clearCuratorEditorPickAfterUnfavorite(supabase, user, productId);
  return NextResponse.json({
    message: "Removed",
    aliases: result.aliases,
    clearedEditorPick: result.clearedEditorPick,
  });
}
