import { getServerSupabase } from "../supabase-service-client";

export async function fetchContentToday(workspaceId: string): Promise<{
  dueToday: number;
  inPipeline: number;
  tableReady: boolean;
}> {
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

  if (error) return { dueToday: 0, inPipeline: 0, tableReady: false };

  const rows = data || [];
  const inPipeline = rows.filter((r) => !r.posted).length;
  const dueToday = rows.filter((r) => {
    if (r.posted || !r.publish_at) return false;
    const t = new Date(r.publish_at).getTime();
    return t >= start.getTime() && t < end.getTime();
  }).length;

  return { dueToday, inPipeline, tableReady: true };
}
