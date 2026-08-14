import { getServerSupabase } from "../supabase-service-client";

let missingTableUntil = 0;

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "");
  return (
    code === "PGRST205" ||
    /hq_content_items/i.test(message) ||
    /schema cache/i.test(message) ||
    /does not exist/i.test(message)
  );
}

export async function fetchContentToday(workspaceId: string): Promise<{
  dueToday: number;
  inPipeline: number;
  tableReady: boolean;
}> {
  if (Date.now() < missingTableUntil) {
    return { dueToday: 0, inPipeline: 0, tableReady: false };
  }

  const supabase = getServerSupabase();
  if (!supabase) return { dueToday: 0, inPipeline: 0, tableReady: false };

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const { data, error } = await supabase
    .from("hq_content_items")
    .select("id, posted, publish_at")
    .eq("workspace_id", workspaceId)
    .limit(500);

  if (error) {
    if (isMissingTableError(error)) {
      missingTableUntil = Date.now() + 30 * 60 * 1000;
    }
    return { dueToday: 0, inPipeline: 0, tableReady: false };
  }

  missingTableUntil = 0;
  const rows = data || [];
  const inPipeline = rows.filter((r) => !r.posted).length;
  const dueToday = rows.filter((r) => {
    if (r.posted || !r.publish_at) return false;
    const t = new Date(r.publish_at).getTime();
    return t >= start.getTime() && t < end.getTime();
  }).length;

  return { dueToday, inPipeline, tableReady: true };
}
