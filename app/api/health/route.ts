import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase-server";

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    supabase_url: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_key: !!process.env.SUPABASE_ANON_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    openai_key: !!process.env.OPENAI_API_KEY,
  };

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { count: productCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });
      checks.products = productCount || 0;

      const { count: designerCount } = await supabase
        .from("designers")
        .select("*", { count: "exact", head: true });
      checks.designers = designerCount || 0;

      checks.supabase_connected = true;
    } catch (e: any) {
      checks.supabase_connected = false;
      checks.supabase_error = e.message;
    }
  } else {
    checks.supabase_connected = false;
    checks.supabase_error = "Missing SUPABASE_URL or SUPABASE_ANON_KEY";
  }

  return NextResponse.json(checks);
}
