import type { SupabaseClient } from "@supabase/supabase-js";

export async function listSavedViews(
  client: SupabaseClient,
  organizationId: string,
  moduleKey: string,
  ownerId: string
) {
  const { data } = await client
    .from("saved_views")
    .select("id, name, filters, shared, owner_id, created_at")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .or(`owner_id.eq.${ownerId},shared.eq.true`)
    .order("name");
  return data || [];
}

export async function createSavedView(input: {
  client: SupabaseClient;
  organizationId: string;
  ownerId: string;
  moduleKey: string;
  name: string;
  filters: Record<string, unknown>;
  shared?: boolean;
}) {
  const { data, error } = await input.client
    .from("saved_views")
    .insert({
      organization_id: input.organizationId,
      owner_id: input.ownerId,
      module_key: input.moduleKey,
      name: input.name,
      filters: input.filters,
      shared: input.shared || false,
    })
    .select("id, name, filters, shared")
    .maybeSingle();
  if (error || !data) throw new Error(error?.message || "Could not save view.");
  return data;
}

export async function deleteSavedView(
  client: SupabaseClient,
  organizationId: string,
  ownerId: string,
  viewId: string
) {
  const { error } = await client
    .from("saved_views")
    .delete()
    .eq("organization_id", organizationId)
    .eq("owner_id", ownerId)
    .eq("id", viewId);
  if (error) throw new Error(error.message);
}
