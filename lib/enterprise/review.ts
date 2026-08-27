import { getEnterpriseServiceClient } from "./client";

export async function resolveIssue(input: {
  organizationId: string;
  issueId: string;
  status: "resolved" | "rejected" | "not_applicable";
  actorEmail: string;
}) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) throw new Error("Enterprise database is not linked.");
  const { data: issue } = await supabase
    .from("issues")
    .select("id, product_id")
    .eq("organization_id", input.organizationId)
    .eq("id", input.issueId)
    .maybeSingle();
  if (!issue) throw new Error("Issue not found.");
  const { error } = await supabase
    .from("issues")
    .update({ status: input.status })
    .eq("id", input.issueId)
    .eq("organization_id", input.organizationId);
  if (error) throw new Error(error.message);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", input.actorEmail.toLowerCase())
    .maybeSingle();
  await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_id: profile?.id || null,
    action: `issue_${input.status}`,
    object_type: "issue",
    object_id: input.issueId,
  });
}

export async function approveProductFields(input: {
  organizationId: string;
  productId: string;
  actorEmail: string;
}) {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) throw new Error("Enterprise database is not linked.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", input.actorEmail.toLowerCase())
    .maybeSingle();
  const { error } = await supabase
    .from("normalized_fields")
    .update({
      state: "approved",
      locked: true,
      reviewer_id: profile?.id || null,
    })
    .eq("organization_id", input.organizationId)
    .eq("product_id", input.productId)
    .in("field_key", ["name", "composition", "manufacturing_country"]);
  if (error) throw new Error(error.message);
  await supabase
    .from("products")
    .update({ passport_state: "ready" })
    .eq("id", input.productId)
    .eq("organization_id", input.organizationId);
}
