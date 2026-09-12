import { filterFieldsForAccess } from "./access-classes";
import { getEnterpriseServiceClient } from "./client";
import { DEMO_BRAND_SLUG } from "./constants";
import { buildConsumerPassportContent, type ConsumerPassportContent } from "./public-passport-content";
import { loadProductExperienceConfig, type PassportExperienceConfig } from "./passport-experience";

export type PublicPassportView = {
  found: boolean;
  publicId: string;
  productName?: string;
  state?: string;
  versionNumber?: number;
  snapshot?: Record<string, unknown>;
  consumer?: ConsumerPassportContent;
  experience?: PassportExperienceConfig;
};

export async function resolvePublicPassport(
  publicId: string,
  opts?: { recordScan?: boolean; carrierId?: string }
): Promise<PublicPassportView> {
  const id = publicId.trim();
  const unknown: PublicPassportView = { found: false, publicId: id };
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) return unknown;

  const supabase = getEnterpriseServiceClient();
  if (!supabase) return unknown;

  const { data: passport } = await supabase
    .from("passports")
    .select("id, public_id, state, organization_id, product_id, current_version_id, created_at")
    .eq("public_id", id)
    .maybeSingle();

  if (!passport) return unknown;
  if (passport.state !== "published" && passport.state !== "update_required") return unknown;
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

  const [{ data: carriers }, { data: traceNodes }, { data: allVersions }] = await Promise.all([
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
  ]);

  const snapshot = (version?.snapshot || {}) as Record<string, unknown>;
  const fieldList = Array.isArray(snapshot.fields) ? snapshot.fields : [];
  const publicFields = filterFieldsForAccess(
    fieldList.filter((field) => field && typeof field === "object") as Array<{
      access_class?: string | null;
      key?: string;
      value?: string;
    }>
  ) as Array<{ key?: string; value?: string }>;

  const publicSnapshot = {
    product_name: snapshot.product_name || product?.name,
    public_id: id,
    resolver_note: "Public resolver ID is separate from any EU Registry registration identifier.",
    identifier_bundle: snapshot.identifier_bundle || null,
    fields: publicFields,
  };

  const consumer = buildConsumerPassportContent({
    productName: product?.name,
    sku: product?.sku,
    styleCode: product?.style_code,
    category: product?.category,
    snapshotFields: publicFields,
    traceNodes: traceNodes || [],
    passportStatus: passport.state,
    publishedAt: version?.published_at || null,
    passportCreatedAt: passport.created_at || null,
    versions: allVersions || [],
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
