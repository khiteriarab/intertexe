import type { SupabaseClient } from "@supabase/supabase-js";
import { accessClassLabel } from "./access-classes";
import { fieldEvidenceSummary, type EvidenceRecord } from "./evidence";
import { buildIdentifierBundle } from "./identifiers";
import {
  ESPR_FOUNDATION_RULESET,
  evaluateRegulatoryRequirements,
  type RegulatoryRequirementRow,
} from "./regulatory-evaluator";

export type ReadinessDomainStatus = "ready" | "needs_attention" | "not_applicable" | "awaiting_regulation";

export type ReadinessDomain = {
  key: string;
  label: string;
  status: ReadinessDomainStatus;
  summary: string;
  items: Array<{ label: string; status: string; detail: string }>;
};

export type DppReadinessReport = {
  rulesetLabel: string;
  domains: ReadinessDomain[];
  disclaimer: string;
};

export async function loadDppReadiness(
  client: SupabaseClient,
  organizationId: string,
  productId: string
): Promise<DppReadinessReport> {
  const [
    { data: product },
    { data: fields },
    { data: identifiers },
    { data: issues },
    { data: evidence },
    { data: passport },
    { data: ruleVersion },
  ] = await Promise.all([
    client
      .from("products")
      .select("id, name, sku, style_code, category, passport_state")
      .eq("organization_id", organizationId)
      .eq("id", productId)
      .maybeSingle(),
    client
      .from("normalized_fields")
      .select("field_key, normalized_value, state, access_class, locked")
      .eq("organization_id", organizationId)
      .eq("product_id", productId),
    client
      .from("product_identifiers")
      .select("identifier_type, identifier_value")
      .eq("organization_id", organizationId)
      .eq("product_id", productId),
    client
      .from("issues")
      .select("issue_type, severity, title, status, detail")
      .eq("organization_id", organizationId)
      .eq("product_id", productId),
    client
      .from("evidence_records")
      .select(
        "id, field_key, evidence_type, verification_status, document_reference, access_class, expires_at"
      )
      .eq("organization_id", organizationId)
      .eq("product_id", productId),
    client
      .from("passports")
      .select("id, public_id, state, current_version_id")
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .maybeSingle(),
    client
      .from("regulatory_rule_versions")
      .select("id, version_label, framework:regulatory_frameworks(name)")
      .eq("version_label", ESPR_FOUNDATION_RULESET)
      .maybeSingle(),
  ]);

  if (!product) {
    throw new Error("Product not found.");
  }

  const openIssues = (issues || []).filter((row) => row.status === "open");
  const gtin =
    (fields || []).find((row) => row.field_key === "gtin")?.normalized_value ||
    (identifiers || []).find((row) => row.identifier_type === "gtin")?.identifier_value ||
    null;

  const bundle = buildIdentifierBundle({
    productId: product.id,
    sku: product.sku,
    styleCode: product.style_code,
    gtin,
    publicResolverId: passport?.public_id || null,
  });

  if (passport?.current_version_id) {
    const { data: registration } = await client
      .from("dpp_registry_registrations")
      .select("eu_registration_identifier")
      .eq("organization_id", organizationId)
      .eq("passport_version_id", passport.current_version_id)
      .maybeSingle();
    if (registration?.eu_registration_identifier) {
      bundle.eu_registry_registration_identifier = registration.eu_registration_identifier;
    }
  }

  const identityItems = [
    {
      label: "SKU / style / GTIN",
      status: bundle.canonical_product_identifier ? "ready" : "needs_attention",
      detail: bundle.canonical_product_identifier || "No canonical product identifier.",
    },
    {
      label: "Public resolver ID",
      status: bundle.public_resolver_id ? "ready" : "needs_attention",
      detail: bundle.public_resolver_id || "Not published.",
    },
    {
      label: "Legally conformant unique product ID",
      status: bundle.legally_conformant_unique_product_identifier ? "ready" : "awaiting_regulation",
      detail:
        bundle.legally_conformant_unique_product_identifier ||
        "Awaiting textile delegated act / issuing-system assignment.",
    },
    {
      label: "EU Registry registration ID",
      status: bundle.eu_registry_registration_identifier ? "ready" : "needs_attention",
      detail: bundle.eu_registry_registration_identifier || "Not registered in EU Registry.",
    },
  ];

  const identityStatus: ReadinessDomainStatus = identityItems.some((row) => row.status === "needs_attention")
    ? "needs_attention"
    : identityItems.some((row) => row.status === "awaiting_regulation")
      ? "awaiting_regulation"
      : "ready";

  const materialFields = (fields || []).filter((row) =>
    ["composition", "materials", "country_of_origin", "care_instructions"].includes(row.field_key)
  );
  const materialItems = materialFields.length
    ? materialFields.map((row) => ({
        label: row.field_key,
        status: row.normalized_value ? "ready" : "needs_attention",
        detail: row.normalized_value || "Missing normalized value.",
      }))
    : [
        {
          label: "composition",
          status: "needs_attention",
          detail: "Composition not present.",
        },
      ];

  const evidenceRecords = (evidence || []) as EvidenceRecord[];
  const evidenceFields = ["composition", "country_of_origin", "materials"];
  const evidenceItems = evidenceFields.map((fieldKey) => {
    const summary = fieldEvidenceSummary(fieldKey, evidenceRecords, openIssues);
    return {
      label: fieldKey,
      status: summary.status === "verified" ? "ready" : "needs_attention",
      detail: summary.detail,
    };
  });

  let requirements: RegulatoryRequirementRow[] = [];
  if (ruleVersion?.id) {
    const { data: reqRows } = await client
      .from("regulatory_requirements")
      .select(
        "id, requirement_key, field_key, required, authoritative_source, source_reference, source_url, access_class, severity, obligation_kind, applicability"
      )
      .eq("rule_version_id", ruleVersion.id);
    requirements = (reqRows || []) as RegulatoryRequirementRow[];
  }

  const frameworkName =
    (ruleVersion?.framework as { name?: string } | null)?.name || "ESPR foundation";
  const regulatory = evaluateRegulatoryRequirements({
    rulesetVersion: ESPR_FOUNDATION_RULESET,
    frameworkName,
    requirements,
    product,
    fields: fields || [],
    identifiers: identifiers || [],
    passportPublicId: passport?.public_id || null,
    openIssues: openIssues.map((row) => ({
      issue_type: row.issue_type,
      field_key: row.detail?.includes("field:") ? row.detail.split("field:")[1]?.split("|")[0] : null,
    })),
  });

  const regulatoryItems = regulatory.requirements.map((row) => ({
    label: row.requirementKey,
    status: row.status,
    detail: row.detail,
  }));

  const accessItems = (fields || []).map((row) => ({
    label: row.field_key,
    status: row.access_class ? "ready" : "needs_attention",
    detail: accessClassLabel(row.access_class),
  }));

  let passportItems: Array<{ label: string; status: string; detail: string }> = [];
  let passportStatus: ReadinessDomainStatus = "needs_attention";
  if (passport?.current_version_id) {
    const { data: version } = await client
      .from("passport_versions")
      .select("version_number, integrity_hash, previous_version_id, published_at")
      .eq("id", passport.current_version_id)
      .maybeSingle();
    passportItems = [
      {
        label: "Published version",
        status: version?.published_at ? "ready" : "needs_attention",
        detail: version ? `v${version.version_number}` : "No version.",
      },
      {
        label: "Integrity hash",
        status: version?.integrity_hash ? "ready" : "needs_attention",
        detail: version?.integrity_hash || "Hash not recorded.",
      },
      {
        label: "Version chain",
        status: version?.version_number === 1 || version?.previous_version_id ? "ready" : "not_applicable",
        detail:
          version?.previous_version_id != null
            ? "Linked to previous passport version."
            : version?.version_number === 1
              ? "Initial version."
              : "No previous version link.",
      },
    ];
    passportStatus =
      passport.state === "published" && version?.integrity_hash ? "ready" : "needs_attention";
  } else {
    passportItems = [{ label: "Passport", status: "needs_attention", detail: "Not published." }];
  }

  let registryItems: Array<{ label: string; status: string; detail: string }> = [
    { label: "Registry", status: "needs_attention", detail: "No published passport version." },
  ];
  let registryStatus: ReadinessDomainStatus = "not_applicable";
  if (passport?.current_version_id) {
    const { data: registration } = await client
      .from("dpp_registry_registrations")
      .select("status, eu_registration_identifier, environment, submission_payload_hash")
      .eq("organization_id", organizationId)
      .eq("passport_version_id", passport.current_version_id)
      .maybeSingle();
    registryItems = [
      {
        label: "Registration status",
        status: registration?.status === "registered" ? "ready" : "needs_attention",
        detail: registration?.status || "not_registered",
      },
      {
        label: "EU registration identifier",
        status: registration?.eu_registration_identifier ? "ready" : "needs_attention",
        detail: registration?.eu_registration_identifier || "Not captured.",
      },
      {
        label: "Environment",
        status: registration?.environment ? "ready" : "needs_attention",
        detail: registration?.environment || "sandbox (default)",
      },
    ];
    registryStatus =
      registration?.status === "registered"
        ? "ready"
        : registration?.status === "registration_ready" || registration?.status === "submitted"
          ? "needs_attention"
          : "awaiting_regulation";
  }

  return {
    rulesetLabel: `ESPR foundation readiness (${ESPR_FOUNDATION_RULESET})`,
    disclaimer:
      "This is readiness against an explicitly named INTERTEXE ruleset — not EU certification or full textile DPP compliance.",
    domains: [
      {
        key: "identity",
        label: "Identity",
        status: identityStatus,
        summary: "Internal UUID, SKU/style/GTIN, resolver ID, and external identifiers are tracked separately.",
        items: identityItems,
      },
      {
        key: "product_material",
        label: "Product / material data",
        status: materialItems.some((row) => row.status === "needs_attention")
          ? "needs_attention"
          : "ready",
        summary: "Canonical normalized fields for publication.",
        items: materialItems,
      },
      {
        key: "evidence",
        label: "Evidence",
        status: evidenceItems.some((row) => row.status !== "ready") ? "needs_attention" : "ready",
        summary: "Supporting evidence is verified separately from uploaded files.",
        items: evidenceItems,
      },
      {
        key: "regulatory",
        label: "Regulatory requirements",
        status:
          regulatory.overall === "ready"
            ? "ready"
            : regulatory.overall === "awaiting_regulation"
              ? "awaiting_regulation"
              : "needs_attention",
        summary: regulatory.frameworkName,
        items: regulatoryItems,
      },
      {
        key: "access",
        label: "Access / data classification",
        status: accessItems.length ? "ready" : "needs_attention",
        summary: "Field-level access classification for server-side enforcement.",
        items: accessItems,
      },
      {
        key: "passport",
        label: "Passport",
        status: passportStatus,
        summary: "Immutable published versions with integrity and version chain.",
        items: passportItems,
      },
      {
        key: "registry",
        label: "Registry",
        status: registryStatus,
        summary: "EU DPP Registry registration is separate from INTERTEXE public resolver ID.",
        items: registryItems,
      },
    ],
  };
}
