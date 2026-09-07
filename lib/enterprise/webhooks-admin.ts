import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export async function createWebhook(input: {
  client: SupabaseClient;
  organizationId: string;
  url: string;
  label?: string;
  events?: string[];
}): Promise<{ id: string; secret: string }> {
  const secret = randomBytes(32).toString("base64url");
  const { data, error } = await input.client
    .from("webhooks")
    .insert({
      organization_id: input.organizationId,
      url: input.url,
      label: input.label || null,
      events: input.events || ["passport.published", "import.completed"],
      secret_hash: hashSecret(secret),
      active: true,
    })
    .select("id")
    .maybeSingle();
  if (error || !data?.id) throw new Error(error?.message || "Could not create webhook.");
  return { id: data.id, secret };
}

export async function revokeWebhook(client: SupabaseClient, organizationId: string, webhookId: string) {
  const { error } = await client
    .from("webhooks")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", webhookId);
  if (error) throw new Error(error.message);
}

export async function listWebhooks(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("webhooks")
    .select("id, url, label, events, active, last_success_at, last_failure_at, last_error, created_at, revoked_at")
    .eq("organization_id", organizationId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return data || [];
}

/** Stub dispatcher — records success/failure on webhook row. Real HTTP delivery can be wired later. */
export async function dispatchWebhookEvent(
  client: SupabaseClient,
  organizationId: string,
  event: string,
  payload: Record<string, unknown>
) {
  const { data: hooks } = await client
    .from("webhooks")
    .select("id, url, events, active")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .is("revoked_at", null);

  for (const hook of hooks || []) {
    if (hook.events?.length && !hook.events.includes(event) && !hook.events.includes("*")) continue;
    try {
      // Production would POST signed payload to hook.url
      void payload;
      await client
        .from("webhooks")
        .update({ last_success_at: new Date().toISOString(), last_error: null })
        .eq("id", hook.id);
    } catch (e) {
      await client
        .from("webhooks")
        .update({
          last_failure_at: new Date().toISOString(),
          last_error: e instanceof Error ? e.message : String(e),
        })
        .eq("id", hook.id);
    }
  }
}
