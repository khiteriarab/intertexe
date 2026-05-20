/**
 * Server-side timing for Supabase calls (homepage / catalog debugging).
 * Set LOG_SUPABASE_TIMING=1 to always log; otherwise logs in development only.
 */
export function shouldLogSupabaseTiming(): boolean {
  return (
    process.env.LOG_SUPABASE_TIMING === "1" ||
    process.env.NODE_ENV === "development"
  );
}

export function logSupabaseTiming(stage: string, startedAt: number, detail?: string): void {
  if (!shouldLogSupabaseTiming()) return;
  const ms = Date.now() - startedAt;
  const extra = detail ? ` ${detail}` : "";
  console.log(`[supabase-timing] ${stage} ${ms}ms${extra}`);
}
