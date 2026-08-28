import type { SupabaseClient } from "@supabase/supabase-js";
import { buildIdentifierBundle } from "../identifiers";
import { integrityHash } from "../integrity";
import { getRegistryProvider } from "./manual-provider";
import type {
  RegistrationReadyPayload,
  RegistryEnvironment,
  RegistryRegistrationStatus,
} from "./types";

export const DEFAULT_REGISTRY_ENV: RegistryEnvironment =
  process.env.ENTERPRISE_REGISTRY_ENV === "production" ? "production" : "sandbox";

export async function loadRegistryRegistration(
  client: SupabaseClient,
  organizationId: string,
  passportVersionId: string,
  environment: RegistryEnvironment = DEFAULT_REGISTRY_ENV
) {
  const { data } = await client
    .from("dpp_registry_registrations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("passport_version_id", passportVersionId)
    .eq("environment", environment)
    .maybeSingle();
  return data;
}

export async function prepareRegistryRegistration(input: {
  client: SupabaseClient;
  organizationId: string;
  passportId: string;
  passportVersionId: string;
  productId: string;
  environment?: RegistryEnvironment;
  actorId?: string | null;
}): Promise<{ status: RegistryRegistrationStatus; payload: RegistrationReadyPayload }> {
  const environment = input.environment || DEFAULT_REGISTRY_ENV;
  const provider = getRegistryProvider(environment);

  const [{ data: product }, { data: version }, { data: passport }, { data: operatorLink }] =
    await Promise.all([
      input.client
        .from("products")
        .select("id, name, sku, style_code")
        .eq("organization_id", input.organizationId)
        .eq("id", input.productId)
        .maybeSingle(),
      input.client
        .from("passport_versions")
        .select("version_number, integrity_hash, identifier_bundle, snapshot")
        .eq("organization_id", input.organizationId)
        .eq("id", input.passportVersionId)
        .maybeSingle(),
      input.client
        .from("passports")
        .select("public_id")
        .eq("organization_id", input.organizationId)
        .eq("id", input.passportId)
        .maybeSingle(),
      input.client
        .from("product_economic_operators")
        .select("economic_operator_id, economic_operators(unique_operator_identifier, company_identifier)")
        .eq("organization_id", input.organizationId)
        .eq("product_id", input.productId)
        .limit(1)
        .maybeSingle(),
    ]);

  if (!product || !version || !passport?.public_id) {
    throw new Error("Published passport version required before registry preparation.");
  }

  const { data: gtinField } = await input.client
    .from("normalized_fields")
    .select("normalized_value")
    .eq("organization_id", input.organizationId)
    .eq("product_id", input.productId)
    .eq("field_key", "gtin")
    .maybeSingle();

  const bundle = buildIdentifierBundle({
    productId: product.id,
    sku: product.sku,
    styleCode: product.style_code,
    gtin: gtinField?.normalized_value || null,
    publicResolverId: passport.public_id,
    dataCarrierUrl: `/p/${passport.public_id}`,
  });

  const productUniqueId =
    bundle.legally_conformant_unique_product_identifier ||
    bundle.gtin ||
    bundle.canonical_product_identifier ||
    passport.public_id;

  const operatorRow = operatorLink?.economic_operators as
    | { unique_operator_identifier?: string; company_identifier?: string }
    | { unique_operator_identifier?: string; company_identifier?: string }[]
    | null;
  const operator = Array.isArray(operatorRow) ? operatorRow[0] : operatorRow;

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com").replace(/\/$/, "");
  const ready: RegistrationReadyPayload = {
    schema_version: "intertexe.registry-ready.v1",
    registry_environment: environment,
    product_unique_identifier: productUniqueId,
    economic_operator_identifier:
      operator?.unique_operator_identifier || operator?.company_identifier || null,
    commodity_code: null,
    public_resolver_id: passport.public_id,
    public_resolver_url: `${origin}/p/${passport.public_id}`,
    passport_version: version.version_number,
    integrity_hash: version.integrity_hash || null,
    identifier_bundle: bundle,
    submission_note:
      "Prepare for manual EU Registry submission. Textile semantic catalogue may not be available yet.",
  };

  const submissionPayload = provider.buildRegistrationPayload(ready);
  const submission_payload_hash = integrityHash(submissionPayload);

  const row = {
    organization_id: input.organizationId,
    passport_id: input.passportId,
    passport_version_id: input.passportVersionId,
    environment,
    api_version: provider.apiVersion,
    status: "registration_ready" as const,
    product_unique_identifier: productUniqueId,
    economic_operator_identifier: ready.economic_operator_identifier,
    commodity_code: ready.commodity_code,
    submission_payload: submissionPayload,
    submission_payload_hash,
    error_state: null,
  };

  const existing = await loadRegistryRegistration(
    input.client,
    input.organizationId,
    input.passportVersionId,
    environment
  );
  if (existing?.id) {
    await input.client.from("dpp_registry_registrations").update(row).eq("id", existing.id);
  } else {
    await input.client.from("dpp_registry_registrations").insert(row);
  }

  return { status: "registration_ready", payload: ready };
}

export async function recordRegistrySubmission(input: {
  client: SupabaseClient;
  organizationId: string;
  passportVersionId: string;
  environment?: RegistryEnvironment;
  actorId?: string | null;
  registryResponse?: Record<string, unknown>;
}) {
  const environment = input.environment || DEFAULT_REGISTRY_ENV;
  const existing = await loadRegistryRegistration(
    input.client,
    input.organizationId,
    input.passportVersionId,
    environment
  );
  if (!existing?.id) throw new Error("Registration must be prepared before submission.");
  await input.client
    .from("dpp_registry_registrations")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      submitted_by: input.actorId || null,
      registry_response: input.registryResponse || { manual: true },
    })
    .eq("id", existing.id);
}

export async function attachEuRegistrationIdentifier(input: {
  client: SupabaseClient;
  organizationId: string;
  passportVersionId: string;
  euRegistrationIdentifier: string;
  environment?: RegistryEnvironment;
  actorId?: string | null;
  registryResponse?: Record<string, unknown>;
}) {
  const environment = input.environment || DEFAULT_REGISTRY_ENV;
  const provider = getRegistryProvider(environment);
  const check = provider.validateEuRegistrationIdentifier(input.euRegistrationIdentifier);
  if (!check.valid) throw new Error(check.reason || "Invalid EU registration identifier.");

  const existing = await loadRegistryRegistration(
    input.client,
    input.organizationId,
    input.passportVersionId,
    environment
  );
  if (!existing?.id) throw new Error("Registration record not found.");

  await input.client
    .from("dpp_registry_registrations")
    .update({
      status: "registered",
      eu_registration_identifier: input.euRegistrationIdentifier.trim(),
      verified_at: new Date().toISOString(),
      verified_by: input.actorId || null,
      registry_response: input.registryResponse || existing.registry_response,
      error_state: null,
    })
    .eq("id", existing.id);
}
