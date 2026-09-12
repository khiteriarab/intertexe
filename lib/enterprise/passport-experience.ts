import type { SupabaseClient } from "@supabase/supabase-js";

export const PASSPORT_TEMPLATES = ["editorial", "essential", "trace", "circular"] as const;
export type PassportTemplate = (typeof PASSPORT_TEMPLATES)[number];

export type PassportExperienceBranding = {
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  fontPreset?: "editorial" | "sans";
  brandDisplayName?: string | null;
  editorialCopy?: string | null;
  heroImageUrl?: string | null;
};

export type PassportExperienceConfig = {
  id: string;
  organizationId: string;
  productId: string;
  template: PassportTemplate;
  branding: PassportExperienceBranding;
  customDomain: string | null;
  resolverHost: "intertexe" | "custom";
  updatedAt?: string;
};

export const TEMPLATE_META: Record<
  PassportTemplate,
  { label: string; description: string; emphasis: string }
> = {
  editorial: {
    label: "Editorial",
    description: "Large imagery, storytelling, origin journey, craftsmanship.",
    emphasis: "Luxury & fashion",
  },
  essential: {
    label: "Essential",
    description: "Clean product information — composition, origin, care, circularity.",
    emphasis: "Clarity first",
  },
  trace: {
    label: "Trace",
    description: "Lifecycle-first — supply chain, facilities, provenance, manufacturing.",
    emphasis: "Traceability",
  },
  circular: {
    label: "Circular",
    description: "Care, repair, resale, take-back, recycling and end-of-life emphasized.",
    emphasis: "Circularity",
  },
};

export const DEFAULT_EXPERIENCE: Omit<PassportExperienceConfig, "id" | "organizationId" | "productId"> = {
  template: "editorial",
  branding: {
    fontPreset: "editorial",
    primaryColor: "#3e6268",
    accentColor: "#c4a574",
  },
  customDomain: null,
  resolverHost: "intertexe",
};

function parseBranding(raw: unknown): PassportExperienceBranding {
  if (!raw || typeof raw !== "object") return DEFAULT_EXPERIENCE.branding;
  const b = raw as Record<string, unknown>;
  return {
    logoUrl: typeof b.logoUrl === "string" ? b.logoUrl : null,
    primaryColor: typeof b.primaryColor === "string" ? b.primaryColor : DEFAULT_EXPERIENCE.branding.primaryColor,
    accentColor: typeof b.accentColor === "string" ? b.accentColor : DEFAULT_EXPERIENCE.branding.accentColor,
    fontPreset: b.fontPreset === "sans" ? "sans" : "editorial",
    brandDisplayName: typeof b.brandDisplayName === "string" ? b.brandDisplayName : null,
    editorialCopy: typeof b.editorialCopy === "string" ? b.editorialCopy : null,
    heroImageUrl: typeof b.heroImageUrl === "string" ? b.heroImageUrl : null,
  };
}

export function rowToExperienceConfig(row: {
  id: string;
  organization_id: string;
  product_id: string;
  template: string;
  branding: unknown;
  custom_domain: string | null;
  resolver_host: string;
  updated_at?: string;
}): PassportExperienceConfig {
  const template = PASSPORT_TEMPLATES.includes(row.template as PassportTemplate)
    ? (row.template as PassportTemplate)
    : "editorial";
  return {
    id: row.id,
    organizationId: row.organization_id,
    productId: row.product_id,
    template,
    branding: parseBranding(row.branding),
    customDomain: row.custom_domain,
    resolverHost: row.resolver_host === "custom" ? "custom" : "intertexe",
    updatedAt: row.updated_at,
  };
}

export async function loadProductExperienceConfig(
  client: SupabaseClient,
  organizationId: string,
  productId: string
): Promise<PassportExperienceConfig> {
  const { data } = await client
    .from("passport_experience_configs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .maybeSingle();

  if (data) return rowToExperienceConfig(data);

  const { data: org } = await client
    .from("organizations")
    .select("passport_experience_defaults")
    .eq("id", organizationId)
    .maybeSingle();

  const defaults = (org?.passport_experience_defaults || {}) as Record<string, unknown>;
  const template =
    typeof defaults.template === "string" && PASSPORT_TEMPLATES.includes(defaults.template as PassportTemplate)
      ? (defaults.template as PassportTemplate)
      : "editorial";

  return {
    id: "",
    organizationId,
    productId,
    template,
    branding: parseBranding(defaults.branding),
    customDomain: null,
    resolverHost: "intertexe",
  };
}

export async function upsertProductExperienceConfig(
  client: SupabaseClient,
  input: {
    organizationId: string;
    productId: string;
    template: PassportTemplate;
    branding?: PassportExperienceBranding;
    customDomain?: string | null;
    resolverHost?: "intertexe" | "custom";
  }
): Promise<PassportExperienceConfig> {
  const payload = {
    organization_id: input.organizationId,
    product_id: input.productId,
    template: input.template,
    branding: input.branding || DEFAULT_EXPERIENCE.branding,
    custom_domain: input.customDomain ?? null,
    resolver_host: input.resolverHost || "intertexe",
  };

  const { data, error } = await client
    .from("passport_experience_configs")
    .upsert(payload, { onConflict: "organization_id,product_id" })
    .select("*")
    .maybeSingle();

  if (error || !data) throw new Error(error?.message || "Could not save passport experience.");
  return rowToExperienceConfig(data);
}

export function resolverUrlForConfig(publicId: string, config: PassportExperienceConfig, origin: string): string {
  if (config.resolverHost === "custom" && config.customDomain) {
    const host = config.customDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}/p/${publicId}`;
  }
  return `${origin.replace(/\/$/, "")}/p/${publicId}`;
}
