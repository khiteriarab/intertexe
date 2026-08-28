import type { SupabaseClient } from "@supabase/supabase-js";

export type EconomicOperatorInput = {
  legalName: string;
  operatorRole: "manufacturer" | "importer" | "authorised_representative" | "distributor" | "other";
  registeredAddress?: string;
  country?: string;
  companyIdentifier?: string;
  vatNumber?: string;
  eoriNumber?: string;
  uniqueOperatorIdentifier?: string;
  contactEmail?: string;
  contactPhone?: string;
  registryEnrollment?: Record<string, unknown>;
};

export async function upsertEconomicOperator(
  client: SupabaseClient,
  organizationId: string,
  input: EconomicOperatorInput
) {
  const row = {
    organization_id: organizationId,
    legal_name: input.legalName.trim(),
    operator_role: input.operatorRole,
    registered_address: input.registeredAddress || null,
    country: input.country || null,
    company_identifier: input.companyIdentifier || null,
    vat_number: input.vatNumber || null,
    eori_number: input.eoriNumber || null,
    unique_operator_identifier: input.uniqueOperatorIdentifier || null,
    contact_email: input.contactEmail || null,
    contact_phone: input.contactPhone || null,
    registry_enrollment: input.registryEnrollment || {},
    active: true,
  };
  const { data, error } = await client.from("economic_operators").insert(row).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id;
}

export async function assignProductEconomicOperator(
  client: SupabaseClient,
  organizationId: string,
  productId: string,
  economicOperatorId: string
) {
  await client.from("product_economic_operators").upsert({
    organization_id: organizationId,
    product_id: productId,
    economic_operator_id: economicOperatorId,
    assignment_role: "responsible_operator",
  });
}

export async function loadProductEconomicOperator(
  client: SupabaseClient,
  organizationId: string,
  productId: string
) {
  const { data } = await client
    .from("product_economic_operators")
    .select("economic_operators(*)")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();
  const row = data?.economic_operators;
  return Array.isArray(row) ? row[0] : row;
}
