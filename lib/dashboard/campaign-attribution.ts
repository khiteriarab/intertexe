import { getServerSupabase } from "../supabase-service-client";

export async function fetchCampaignAttribution(workspaceId: string) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      registrationsAttributed: 0,
      firstScansAttributed: 0,
      clicksAttributed: 0,
      byCampaign: [] as Array<{
        utm_campaign: string;
        utm_source: string | null;
        signups: number;
        scans: number;
        clicks: number;
      }>,
    };
  }

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: events } = await supabase
    .from("hq_customer_events")
    .select("event_name, metadata, event_timestamp")
    .eq("workspace_id", workspaceId)
    .gte("event_timestamp", since)
    .in("event_name", ["signup", "scan_completed", "affiliate_click", "scanner_clickout"])
    .limit(2000);

  const rows = events || [];
  let registrationsAttributed = 0;
  let firstScansAttributed = 0;
  let clicksAttributed = 0;
  const byKey = new Map<
    string,
    { utm_campaign: string; utm_source: string | null; signups: number; scans: number; clicks: number }
  >();

  for (const e of rows) {
    const meta = (e.metadata || {}) as Record<string, unknown>;
    const campaign = typeof meta.utm_campaign === "string" ? meta.utm_campaign : null;
    const source = typeof meta.utm_source === "string" ? meta.utm_source : null;
    if (!campaign && !source) continue;

    if (e.event_name === "signup") registrationsAttributed += 1;
    if (e.event_name === "scan_completed") firstScansAttributed += 1;
    if (e.event_name === "affiliate_click" || e.event_name === "scanner_clickout") {
      clicksAttributed += 1;
    }

    const key = `${source || "direct"}::${campaign || "none"}`;
    const cur = byKey.get(key) || {
      utm_campaign: campaign || "(source only)",
      utm_source: source,
      signups: 0,
      scans: 0,
      clicks: 0,
    };
    if (e.event_name === "signup") cur.signups += 1;
    if (e.event_name === "scan_completed") cur.scans += 1;
    if (e.event_name === "affiliate_click" || e.event_name === "scanner_clickout") cur.clicks += 1;
    byKey.set(key, cur);
  }

  return {
    registrationsAttributed,
    firstScansAttributed,
    clicksAttributed,
    byCampaign: [...byKey.values()].sort(
      (a, b) => b.signups + b.scans + b.clicks - (a.signups + a.scans + a.clicks)
    ),
  };
}
