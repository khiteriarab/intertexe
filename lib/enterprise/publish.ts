import type { SupabaseClient } from "@supabase/supabase-js";
import { createPassportBackupPackage } from "./backup-provider";
import { assertCanPublishPassport, recordPassportPublished } from "./billing-gates";
import { ensurePassportShell, publicResolverUrl, syncQrCarrierOnPublish } from "./carriers";
import { buildIdentifierBundle } from "./identifiers";
import { integrityHash } from "./integrity";
import { ITX_RULESET_VERSION } from "./intelligence";
import { ITX_ONTOLOGY_VERSION } from "./ontology";
import { evaluatePublishability } from "./publishability";
import { emitWorkflowEvent } from "./workflow-events";
import { dispatchWebhookEvent } from "./webhooks-admin";

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
  const gate = await assertCanPublishPassport(input.client, input.organizationId, input.productId);
  if (!gate.allowed) {
    throw new Error(gate.reason);
  }

  const check = await publishabilityForProduct(input.client, input.organizationId, input.productId);
  if (check.status === "blocked") {
    throw new Error(`Passport cannot be published: ${check.blockers.join("; ")}`);
  }
  const supabase = input.client;

  const { data: product } = await supabase
    .from("products")
    .select("id, name, sku, style_code")
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
    const shell = await ensurePassportShell(supabase, input.organizationId, input.productId);
    identity = { id: shell.identityId, public_id: shell.publicId };
  }
  if (!identity?.public_id) throw new Error("Could not allocate a public identity.");

  const publicUrl = publicResolverUrl(identity.public_id);
  const publicFields = (fields || [])
    .filter((row) => row.access_class === "public" && row.normalized_value)
    .map((row) => ({
      key: row.field_key,
      value: row.normalized_value,
      access_class: "public",
    }));
  const gtin = (fields || []).find((row) => row.field_key === "gtin")?.normalized_value || null;
  const identifierBundle = buildIdentifierBundle({
    productId: input.productId,
    sku: product?.sku,
    styleCode: product?.style_code,
    gtin,
    publicResolverId: identity.public_id,
    passportPublicId: identity.public_id,
    dataCarrierUrl: publicUrl,
  });
  const snapshot = {
    product_name: product?.name,
    public_id: identity.public_id,
    fields: publicFields,
    identifier_bundle: identifierBundle,
    ontology_version: ITX_ONTOLOGY_VERSION,
    ruleset_version: ITX_RULESET_VERSION,
    integrity_note: "Public snapshot excludes non-public fields by access_class.",
  };
  const snapshotIntegrityHash = integrityHash(snapshot);

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

  const { data: priorVersions } = await supabase
    .from("passport_versions")
    .select("id, version_number")
    .eq("passport_id", passport.id)
    .order("version_number", { ascending: false })
    .limit(1);
  const previousVersion = priorVersions?.[0] || null;
  const versionNumber = (previousVersion?.version_number || 0) + 1;
  const versionRow = {
    organization_id: input.organizationId,
    passport_id: passport.id,
    version_number: versionNumber,
    state: "published",
    published_at: new Date().toISOString(),
    ruleset_version: ITX_RULESET_VERSION,
    ontology_version: ITX_ONTOLOGY_VERSION,
    snapshot,
    integrity_hash: snapshotIntegrityHash,
    previous_version_id: previousVersion?.id || null,
    identifier_bundle: identifierBundle,
    retention_metadata: {
      policy: "immutable_published_versions",
      recovery: "passport_backup_packages",
    },
    change_summary: versionNumber === 1 ? "Initial publication" : `Published v${versionNumber}`,
    actor_id: profile?.id || null,
  };
  let { data: version, error: versionError } = await supabase
    .from("passport_versions")
    .insert(versionRow)
    .select("id, version_number")
    .maybeSingle();
  if (versionError) {
    const {
      ontology_version: _o,
      integrity_hash: _h,
      previous_version_id: _p,
      identifier_bundle: _i,
      retention_metadata: _r,
      ...legacyRow
    } = versionRow;
    const retry = await supabase
      .from("passport_versions")
      .insert(legacyRow)
      .select("id, version_number")
      .maybeSingle();
    version = retry.data;
    versionError = retry.error;
  }
  if (versionError || !version?.id) throw new Error(versionError?.message || "Version insert failed.");

  try {
    const { data: evidenceRows } = await supabase
      .from("evidence_records")
      .select("id, field_key, evidence_type, verification_status, document_reference, access_class")
      .eq("organization_id", input.organizationId)
      .eq("product_id", input.productId);
    await createPassportBackupPackage({
      client: supabase,
      organizationId: input.organizationId,
      passportId: passport.id,
      passportVersionId: version.id,
      versionNumber: version.version_number,
      snapshot,
      identifierBundle,
      integrityHashValue: snapshotIntegrityHash,
      evidenceManifest: (evidenceRows || []).map((row) => ({
        evidence_id: row.id,
        field_key: row.field_key,
        evidence_type: row.evidence_type,
        verification_status: row.verification_status,
        document_reference: row.document_reference,
        access_class: row.access_class,
      })),
    });
  } catch {
    // Backup tables may not be migrated yet; publication must still succeed for pilot path.
  }

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

  const isFirstPublish = versionNumber === 1;

  await syncQrCarrierOnPublish(supabase, {
    organizationId: input.organizationId,
    productId: input.productId,
    passportId: passport.id,
    identityId: identity.id,
    publicUrl,
  });

  await recordPassportPublished(supabase, input.organizationId, isFirstPublish);

  await emitWorkflowEvent({
    client: supabase,
    organizationId: input.organizationId,
    actorId: profile?.id || null,
    kind: "passport_published",
    title: `Published passport ${identity.public_id} v${versionNumber}`,
    detail: `product:${input.productId} | url:${publicUrl}`,
    href: publicUrl,
    audit: {
      action: "passport_published",
      objectType: "passport",
      objectId: passport.id,
      resultingRef: `v${versionNumber}`,
    },
  });
  await dispatchWebhookEvent(supabase, input.organizationId, "passport.published", {
    public_id: identity.public_id,
    version: versionNumber,
    product_id: input.productId,
    url: publicUrl,
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
