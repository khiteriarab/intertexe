import { getEnterpriseServiceClient } from "./client";

export async function deleteOrganizationForTest(organizationId: string): Promise<{
  ok: boolean;
  summary: unknown;
}> {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return { ok: false, summary: { reason: "enterprise_unconfigured" } };
  const { data, error } = await supabase.rpc("execute_organization_deletion", {
    target: organizationId,
  });
  if (error) return { ok: false, summary: { reason: error.message } };
  return { ok: true, summary: data };
}
