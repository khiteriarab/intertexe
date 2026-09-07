import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureIntegrationConnection(
  client: SupabaseClient,
  organizationId: string,
  integrationKey: string,
  label: string
) {
  const { data } = await client
    .from("integration_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("integration_key", integrationKey)
    .maybeSingle();
  if (data?.id) return data.id;

  const { data: created, error } = await client
    .from("integration_connections")
    .insert({
      organization_id: organizationId,
      integration_key: integrationKey,
      label,
      status: "connected",
    })
    .select("id")
    .maybeSingle();
  if (error || !created?.id) throw new Error(error?.message || "Could not create integration connection.");
  return created.id;
}

export async function recordIntegrationRun(
  client: SupabaseClient,
  input: {
    organizationId: string;
    connectionId: string;
    status: "queued" | "running" | "succeeded" | "failed";
    recordsProcessed?: number;
    errorMessage?: string;
  }
) {
  const finished = ["succeeded", "failed"].includes(input.status);
  const { data, error } = await client
    .from("integration_runs")
    .insert({
      organization_id: input.organizationId,
      connection_id: input.connectionId,
      status: input.status,
      records_processed: input.recordsProcessed || 0,
      error_message: input.errorMessage || null,
      finished_at: finished ? new Date().toISOString() : null,
    })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status === "succeeded") {
    patch.last_success_at = new Date().toISOString();
    patch.status = "connected";
    patch.last_error = null;
    if (input.recordsProcessed) {
      patch.records_processed = input.recordsProcessed;
    }
  }
  if (input.status === "failed") {
    patch.last_failure_at = new Date().toISOString();
    patch.last_error = input.errorMessage || "Unknown error";
    patch.status = "error";
  }
  await client.from("integration_connections").update(patch).eq("id", input.connectionId);
  return data?.id;
}

export async function loadIntegrationHealth(client: SupabaseClient, organizationId: string) {
  const { data: connections } = await client
    .from("integration_connections")
    .select("id, integration_key, label, status, last_success_at, last_failure_at, last_error, records_processed, updated_at")
    .eq("organization_id", organizationId)
    .order("label");

  const ids = (connections || []).map((c) => c.id);
  const { data: runs } = ids.length
    ? await client
        .from("integration_runs")
        .select("id, connection_id, status, records_processed, error_message, started_at, finished_at")
        .in("connection_id", ids)
        .order("started_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const runsByConnection = new Map<string, typeof runs>();
  for (const run of runs || []) {
    const list = runsByConnection.get(run.connection_id) || [];
    if (list.length < 5) list.push(run);
    runsByConnection.set(run.connection_id, list);
  }

  return (connections || []).map((conn) => ({
    ...conn,
    recentRuns: runsByConnection.get(conn.id) || [],
  }));
}

export async function retryIntegration(client: SupabaseClient, organizationId: string, connectionId: string) {
  const { data: conn } = await client
    .from("integration_connections")
    .select("id, integration_key, label")
    .eq("organization_id", organizationId)
    .eq("id", connectionId)
    .maybeSingle();
  if (!conn) throw new Error("Integration not found.");

  return recordIntegrationRun(client, {
    organizationId,
    connectionId: conn.id,
    status: "running",
  });
}
