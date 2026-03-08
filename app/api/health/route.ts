import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase-server";

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env_found: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    },
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
    checks.supabase_error = "No env var matched for URL or KEY";
  }

  return NextResponse.json(checks);
}
