import type { SupabaseClient } from "@supabase/supabase-js";
import { newPublicId } from "./ids";
import { ITX_RULESET_VERSION } from "./intelligence";
import { ITX_ONTOLOGY_VERSION } from "./ontology";
import { evaluatePublishability } from "./publishability";

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com").replace(/\/$/, "");
}

export async function publishabilityForProduct(
  client: SupabaseClient,
  organizationId: string,
  productId: string
) {
  const supabase = client;

  const { data: product } = await supabase
    .from("products")
    .select("id, name, sku, style_code")
    .eq("organization_id", organizationId)
    .eq("id", productId)
    .maybeSingle();
  const { data: fields } = await supabase
    .from("normalized_fields")
    .select("field_key, normalized_value, state, locked, access_class")
    .eq("organization_id", organizationId)
    .eq("product_id", productId);
  const { data: issues } = await supabase
    .from("issues")
    .select("issue_type, severity, status")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .eq("status", "open");
  const { data: identity } = await supabase
    .from("persistent_identities")
    .select("public_id")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .eq("active", true)
    .maybeSingle();
  const { data: passport } = await supabase
    .from("passports")
    .select("public_id")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .maybeSingle();

  const fieldMap = new Map((fields || []).map((row) => [row.field_key, row]));
  const composition = fieldMap.get("composition");
  const identityPresent = Boolean(product?.name && (product.sku || product.style_code || fieldMap.get("gtin")));
  const requiredFieldsPresent = Boolean(product?.name && composition?.normalized_value);
  const criticalConflicts = (issues || []).filter((row) => row.issue_type === "conflict").length;
  const criticalValidations = (issues || []).filter(
    (row) => row.issue_type === "validation" && (row.severity === "critical" || row.severity === "high")
  ).length;
  const unresolvedMissingData = (issues || []).filter(
    (row) => row.issue_type === "missing_data" && (row.severity === "critical" || row.severity === "high")
  ).length;
  const unresolvedIdentityIssues = (issues || []).filter(
    (row) => row.issue_type === "identifier" && (row.severity === "critical" || row.severity === "high")
  ).length;
  const requiredApprovalsComplete = Boolean(
    composition && (composition.state === "approved" || composition.locked)
  );
  const publicId = identity?.public_id || passport?.public_id || null;

  return evaluatePublishability({
    identityPresent,
    requiredFieldsPresent,
    criticalConflicts,
    criticalValidations,
    requiredApprovalsComplete,
    passportIdentifier: publicId || "pending",
    resolverDestination: publicId ? `${siteOrigin()}/p/${publicId}` : `${siteOrigin()}/p/pending`,
    unresolvedMissingData,
    unresolvedIdentityIssues,
  });
}

export async function publishProductPassport(input: {
  client: SupabaseClient;
  organizationId: string;
  productId: string;
}): Promise<{ publicId: string; version: number; url: string }> {
  const check = await publishabilityForProduct(input.client, input.organizationId, input.productId);
  if (check.status === "blocked") {
    throw new Error(`Passport cannot be published: ${check.blockers.join("; ")}`);
  }
  const supabase = input.client;

  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("id", input.productId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  const { data: fields } = await supabase
    .from("normalized_fields")
    .select("field_key, normalized_value, access_class, state")
    .eq("organization_id", input.organizationId)
    .eq("product_id", input.productId);
  const { data: profile } = await supabase.from("profiles").select("id").maybeSingle();

  let { data: identity } = await supabase
    .from("persistent_identities")
    .select("id, public_id")
    .eq("organization_id", input.organizationId)
    .eq("product_id", input.productId)
    .eq("active", true)
    .maybeSingle();
  if (!identity?.public_id) {
    const publicId = newPublicId();
    const inserted = await supabase
      .from("persistent_identities")
      .insert({
        organization_id: input.organizationId,
        product_id: input.productId,
        public_id: publicId,
      })
      .select("id, public_id")
      .maybeSingle();
    identity = inserted.data;
  }
  if (!identity?.public_id) throw new Error("Could not allocate a public identity.");

  const publicUrl = `${siteOrigin()}/p/${identity.public_id}`;
  const publicFields = (fields || [])
    .filter((row) => row.access_class === "public" && row.normalized_value)
    .map((row) => ({
      key: row.field_key,
      value: row.normalized_value,
      access_class: "public",
    }));
  const snapshot = {
    product_name: product?.name,
    public_id: identity.public_id,
    fields: publicFields,
    ontology_version: ITX_ONTOLOGY_VERSION,
    ruleset_version: ITX_RULESET_VERSION,
  };

  let { data: passport } = await supabase
    .from("passports")
    .select("id, public_id, current_version_id")
    .eq("organization_id", input.organizationId)
    .eq("product_id", input.productId)
    .maybeSingle();
  if (!passport?.id) {
    const created = await supabase
      .from("passports")
      .insert({
        organization_id: input.organizationId,
        product_id: input.productId,
        public_id: identity.public_id,
        state: "ready",
      })
      .select("id, public_id, current_version_id")
      .maybeSingle();
    passport = created.data;
  }
  if (!passport?.id) throw new Error("Could not create passport.");

  const { count } = await supabase
    .from("passport_versions")
    .select("id", { count: "exact", head: true })
    .eq("passport_id", passport.id);
  const versionNumber = (count || 0) + 1;
  const versionRow = {
    organization_id: input.organizationId,
    passport_id: passport.id,
    version_number: versionNumber,
    state: "published",
    published_at: new Date().toISOString(),
    ruleset_version: ITX_RULESET_VERSION,
    ontology_version: ITX_ONTOLOGY_VERSION,
    snapshot,
    change_summary: versionNumber === 1 ? "Initial publication" : `Published v${versionNumber}`,
    actor_id: profile?.id || null,
  };
  let { data: version, error: versionError } = await supabase
    .from("passport_versions")
    .insert(versionRow)
    .select("id, version_number")
    .maybeSingle();
  if (versionError) {
    const { ontology_version: _ignored, ...withoutOntologyColumn } = versionRow;
    const retry = await supabase
      .from("passport_versions")
      .insert(withoutOntologyColumn)
      .select("id, version_number")
      .maybeSingle();
    version = retry.data;
    versionError = retry.error;
  }
  if (versionError || !version?.id) throw new Error(versionError?.message || "Version insert failed.");

  await supabase
    .from("passports")
    .update({
      state: "published",
      public_id: identity.public_id,
      current_version_id: version.id,
    })
    .eq("id", passport.id);
  await supabase
    .from("products")
    .update({ passport_state: "published" })
    .eq("id", input.productId)
    .eq("organization_id", input.organizationId);

  await supabase.from("data_carriers").insert({
    organization_id: input.organizationId,
    passport_id: passport.id,
    carrier_type: "qr",
    artwork_variant: "default",
    public_url: publicUrl,
  });
  await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_id: profile?.id || null,
    action: "passport_published",
    object_type: "passport",
    object_id: passport.id,
    resulting_ref: `v${versionNumber}`,
  });
  await supabase.from("activity_events").insert({
    organization_id: input.organizationId,
    actor_id: profile?.id || null,
    title: `Published passport ${identity.public_id} v${versionNumber}`,
  });

  return { publicId: identity.public_id, version: version.version_number, url: publicUrl };
}

export async function markPassportUpdateRequired(
  client: SupabaseClient,
  organizationId: string,
  productId: string
) {
  const supabase = client;
  const { data: passport } = await supabase
    .from("passports")
    .select("id, state")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .maybeSingle();
  if (passport?.state === "published") {
    await supabase.from("passports").update({ state: "update_required" }).eq("id", passport.id);
    await supabase
      .from("products")
      .update({ passport_state: "update_required" })
      .eq("id", productId)
      .eq("organization_id", organizationId);
  }
}
