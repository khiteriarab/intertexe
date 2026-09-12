import { filterFieldsForAccess } from "./access-classes";
import { getEnterpriseServiceClient } from "./client";
import { DEMO_BRAND_SLUG } from "./constants";
import { buildPassportPreviewContent } from "./passport-preview";
import { buildConsumerPassportContent, type ConsumerPassportContent } from "./public-passport-content";
import { loadProductExperienceConfig, type PassportExperienceConfig } from "./passport-experience";
import { loadLifecycleEvents } from "./resale-service";

export type PublicPassportView = {
  found: boolean;
  publicId: string;
  productName?: string;
  state?: string;
  versionNumber?: number;
  preview?: boolean;
  snapshot?: Record<string, unknown>;
  consumer?: ConsumerPassportContent;
  experience?: PassportExperienceConfig;
};

async function resolvePreviewPassport(
  supabase: NonNullable<ReturnType<typeof getEnterpriseServiceClient>>,
  input: {
    publicId: string;
    organizationId: string;
    productId: string;
    passportState: string;
    passportCreatedAt?: string | null;
  }
): Promise<PublicPassportView | null> {
  const [{ data: product }, { data: fields }, { data: traceNodes }] = await Promise.all([
    supabase
      .from("products")
      .select("name, sku, style_code, category, passport_state")
      .eq("id", input.productId)
      .eq("organization_id", input.organizationId)
      .maybeSingle(),
    supabase
      .from("normalized_fields")
      .select("field_key, normalized_value, original_value, access_class")
      .eq("organization_id", input.organizationId)
      .eq("product_id", input.productId),
    supabase
      .from("supply_chain_nodes")
      .select("tier, tier_label, facility_name, country_code, data_status")
      .eq("organization_id", input.organizationId)
      .eq("product_id", input.productId)
      .order("tier"),
  ]);

  if (!product) return null;

  const consumer = buildPassportPreviewContent({
    product,
    fields: fields || [],
    traceability: {
      productId: input.productId,
      completenessPct: 0,
      knownTierCount: (traceNodes || []).filter((node) => node.data_status === "known").length,
      missingTierLabels: [],
      tiers: (traceNodes || []).map((node) => ({
        tier: node.tier,
        label: node.tier_label || `Tier ${node.tier}`,
        role: "",
        status: node.data_status === "known" ? "known" : "unknown",
        facility: node.facility_name,
        country: null,
        countryCode: node.country_code,
        supplierId: null,
        supplierName: null,
        evidenceStatus: null,
        sourceRecordId: null,
        confidence: null,
        nodeId: null,
      })),
      warnings: [],
    },
    passport: {
      state: input.passportState,
      created_at: input.passportCreatedAt || null,
      versions: [],
    },
  });

  const experience = await loadProductExperienceConfig(supabase, input.organizationId, input.productId);

  return {
    found: true,
    publicId: input.publicId,
    productName: product.name || undefined,
    state: input.passportState,
    preview: true,
    consumer,
    experience,
  };
}

export async function resolvePublicPassport(
  publicId: string,
  opts?: { recordScan?: boolean; carrierId?: string }
): Promise<PublicPassportView> {
  const id = publicId.trim();
  const unknown: PublicPassportView = { found: false, publicId: id };
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) return unknown;

  const supabase = getEnterpriseServiceClient();
  if (!supabase) return unknown;

  let { data: passport } = await supabase
    .from("passports")
    .select("id, public_id, state, organization_id, product_id, current_version_id, created_at")
    .eq("public_id", id)
    .maybeSingle();

  if (!passport) {
    const { data: identity } = await supabase
      .from("persistent_identities")
      .select("public_id, organization_id, product_id")
      .eq("public_id", id)
      .eq("active", true)
      .maybeSingle();
    if (!identity?.product_id) return unknown;
    return (
      (await resolvePreviewPassport(supabase, {
        publicId: id,
        organizationId: identity.organization_id,
        productId: identity.product_id,
        passportState: "ready",
      })) || unknown
    );
  }

  const isPublished = passport.state === "published" || passport.state === "update_required";
  if (!isPublished) {
    return (
      (await resolvePreviewPassport(supabase, {
        publicId: id,
        organizationId: passport.organization_id,
        productId: passport.product_id,
        passportState: passport.state,
        passportCreatedAt: passport.created_at,
      })) || unknown
    );
  }
  if (!passport.current_version_id) return unknown;

  const { data: org } = await supabase
    .from("organizations")
    .select("is_demo, approved_for_public_demo, slug")
    .eq("id", passport.organization_id)
    .maybeSingle();

  // Public resolver may serve published customer passports. Demo endpoint is separate
  // and must still refuse non-demo orgs.
  const { data: version } = passport.current_version_id
    ? await supabase
        .from("passport_versions")
        .select("version_number, snapshot, published_at")
        .eq("id", passport.current_version_id)
        .maybeSingle()
    : { data: null };

  const { data: product } = await supabase
    .from("products")
    .select("name, sku, style_code, category, passport_state")
    .eq("id", passport.product_id)
    .eq("organization_id", passport.organization_id)
    .maybeSingle();

  const [{ data: carriers }, { data: traceNodes }, { data: allVersions }, { data: liveFields }] =
    await Promise.all([
    supabase
      .from("data_carriers")
      .select("id, public_url, carrier_type, state, activated_at, created_at")
      .eq("organization_id", passport.organization_id)
      .eq("passport_id", passport.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("supply_chain_nodes")
      .select("tier, tier_label, facility_name, country_code, data_status")
      .eq("organization_id", passport.organization_id)
      .eq("product_id", passport.product_id)
      .order("tier"),
    supabase
      .from("passport_versions")
      .select("version_number, published_at, created_at")
      .eq("organization_id", passport.organization_id)
      .eq("passport_id", passport.id)
      .order("version_number", { ascending: true }),
    supabase
      .from("normalized_fields")
      .select("field_key, normalized_value, access_class")
      .eq("organization_id", passport.organization_id)
      .eq("product_id", passport.product_id)
      .eq("access_class", "public"),
  ]);

  const snapshot = (version?.snapshot || {}) as Record<string, unknown>;
  const fieldList = Array.isArray(snapshot.fields) ? snapshot.fields : [];
  const snapshotPublicFields = filterFieldsForAccess(
    fieldList.filter((field) => field && typeof field === "object") as Array<{
      access_class?: string | null;
      key?: string;
      value?: string;
    }>
  ) as Array<{ key?: string; value?: string }>;

  const livePublicFields = (liveFields || [])
    .filter((row) => row.field_key && row.normalized_value)
    .map((row) => ({ key: row.field_key, value: String(row.normalized_value) }));

  const mergedByKey = new Map<string, { key?: string; value?: string }>();
  for (const field of snapshotPublicFields) {
    if (field.key) mergedByKey.set(field.key, field);
  }
  for (const field of livePublicFields) {
    if (field.key) mergedByKey.set(field.key, field);
  }
  const publicFields = Array.from(mergedByKey.values());

  const publicSnapshot = {
    product_name: snapshot.product_name || product?.name,
    public_id: id,
    resolver_note: "Public resolver ID is separate from any EU Registry registration identifier.",
    identifier_bundle: snapshot.identifier_bundle || null,
    fields: publicFields,
  };

  const { data: identityRow } = await supabase
    .from("persistent_identities")
    .select("id")
    .eq("public_id", id)
    .eq("active", true)
    .maybeSingle();

  const lifecycleEvents = identityRow?.id
    ? await loadLifecycleEvents(identityRow.id)
    : [];

  const brandField = publicFields.find((f) => f.key === "brand")?.value;

  const consumer = buildConsumerPassportContent({
    productName: product?.name,
    sku: product?.sku,
    styleCode: product?.style_code,
    category: product?.category,
    brand: brandField || null,
    publicId: id,
    snapshotFields: publicFields,
    traceNodes: traceNodes || [],
    passportStatus: passport.state,
    publishedAt: version?.published_at || null,
    passportCreatedAt: passport.created_at || null,
    versions: allVersions || [],
    lifecycleEvents,
  });

  const experience = await loadProductExperienceConfig(
    supabase,
    passport.organization_id,
    passport.product_id
  );

  if (opts?.recordScan) {
    await supabase.from("analytics_events").insert({
      organization_id: passport.organization_id,
      passport_id: passport.id,
      event_name: "passport_scan",
      metadata: {
        public_id: id,
        demo: Boolean(org?.is_demo),
        carrier_id: opts.carrierId || null,
      },
    });
  }

  return {
    found: true,
    publicId: id,
    productName: product?.name || undefined,
    state: passport.state,
    versionNumber: version?.version_number,
    preview: false,
    snapshot: publicSnapshot,
    consumer,
    experience,
  };
}

export async function loadApprovedDemoSummary() {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return null;
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", DEMO_BRAND_SLUG)
    .eq("is_demo", true)
    .eq("approved_for_public_demo", true)
    .maybeSingle();
  if (!org?.id) return null;
  const [{ count: products }, { count: issues }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
  ]);
  return { productCount: products || 0, issueCount: issues || 0, organizationId: org.id };
}
