import { getServerSupabase } from "../supabase-service-client";

/** Lightweight emitter for campaign attribution / growth analytics. */
export async function emitHqCustomerEvent(input: {
  workspaceSlug?: string;
  customerId?: string | null;
  eventName: string;
  eventCategory?: string;
  source?: string;
  sessionId?: string;
  productId?: string;
  campaignId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getServerSupabase();
  if (!supabase) return { ok: false as const, reason: "no_supabase" };

  const slug = input.workspaceSlug || "intertexe";
  const { data: workspace } = await supabase
    .from("hq_workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace?.id) return { ok: false as const, reason: "no_workspace" };

  const { error } = await supabase.from("hq_customer_events").insert({
    workspace_id: workspace.id,
    customer_id: input.customerId || null,
    event_name: input.eventName,
    event_category: input.eventCategory || null,
    source: input.source || "web",
    session_id: input.sessionId || null,
    product_id: input.productId || null,
    campaign_id: input.campaignId || null,
    metadata: input.metadata || {},
  });

  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}
