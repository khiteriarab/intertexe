import { getServerSupabase } from "../supabase-service-client";

/** Pointers only. Never copy catalog, source, issue, or passport rows into HQ. */
export async function writeHqEnterprisePointers(input: {
  hqDealId: string | null;
  organizationId: string;
  slug: string;
  pilotStatus?: string | null;
  implementationStatus?: string | null;
}): Promise<void> {
  if (!input.hqDealId) return;
  const hq = getServerSupabase();
  if (!hq) return;
  await hq
    .from("hq_deals")
    .update({
      enterprise_organization_id: input.organizationId,
      enterprise_organization_slug: input.slug,
      enterprise_pilot_status: input.pilotStatus ?? null,
      enterprise_implementation_status: input.implementationStatus ?? null,
    })
    .eq("id", input.hqDealId);
}
