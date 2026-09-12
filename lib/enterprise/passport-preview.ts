import type { ProductTraceability } from "./traceability";
import { buildConsumerPassportContent, type ConsumerPassportContent } from "./public-passport-content";

type PreviewField = {
  field_key: string;
  normalized_value?: string | null;
  original_value?: string | null;
  access_class?: string | null;
};

export function buildPassportPreviewContent(input: {
  product: {
    name?: string | null;
    sku?: string | null;
    style_code?: string | null;
    category?: string | null;
    passport_state?: string | null;
  };
  fields: PreviewField[];
  traceability?: ProductTraceability | null;
  passport?: {
    state?: string;
    created_at?: string;
    versions?: Array<{ version_number: number; published_at?: string | null; created_at?: string | null }>;
  } | null;
}): ConsumerPassportContent {
  const publicFields = input.fields
    .filter((f) => f.access_class === "public")
    .map((f) => ({
      key: f.field_key,
      value: String(f.normalized_value || f.original_value || "").trim(),
    }))
    .filter((f) => f.value);

  const traceNodes = (input.traceability?.tiers || [])
    .filter((t) => t.status === "known")
    .map((t) => ({
      tier: t.tier,
      tier_label: t.label,
      facility_name: t.facility,
      country_code: t.countryCode,
      data_status: t.status,
    }));

  const publishedVersion = input.passport?.versions?.find((v) => v.published_at);

  return buildConsumerPassportContent({
    productName: input.product.name,
    sku: input.product.sku,
    styleCode: input.product.style_code,
    category: input.product.category,
    snapshotFields: publicFields,
    traceNodes,
    passportStatus: input.passport?.state || input.product.passport_state || "draft",
    publishedAt: publishedVersion?.published_at || null,
    passportCreatedAt: input.passport?.created_at || null,
    versions: input.passport?.versions || [],
  });
}
