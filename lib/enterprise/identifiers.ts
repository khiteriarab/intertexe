export type IdentifierKind =
  | "internal_product_uuid"
  | "sku"
  | "style_id"
  | "gtin"
  | "canonical_product_identifier"
  | "dpp_identifier"
  | "public_resolver_id"
  | "legally_conformant_unique_product_identifier"
  | "eu_registry_registration_identifier"
  | "data_carrier_identifier";

export type ProductIdentifierBundle = {
  internal_product_uuid: string | null;
  sku: string | null;
  style_id: string | null;
  gtin: string | null;
  canonical_product_identifier: string | null;
  dpp_identifier: string | null;
  public_resolver_id: string | null;
  legally_conformant_unique_product_identifier: string | null;
  eu_registry_registration_identifier: string | null;
  data_carrier_identifier: string | null;
};

export function buildIdentifierBundle(input: {
  productId: string;
  sku?: string | null;
  styleCode?: string | null;
  gtin?: string | null;
  publicResolverId?: string | null;
  passportPublicId?: string | null;
  euRegistrationId?: string | null;
  dataCarrierUrl?: string | null;
  externalUniqueProductId?: string | null;
}): ProductIdentifierBundle {
  const sku = input.sku?.trim() || null;
  const style = input.styleCode?.trim() || null;
  const gtin = input.gtin?.trim() || null;
  const canonical = gtin || sku || style;
  const resolver = input.publicResolverId || input.passportPublicId || null;

  return {
    internal_product_uuid: input.productId,
    sku,
    style_id: style,
    gtin,
    canonical_product_identifier: canonical,
    dpp_identifier: resolver,
    public_resolver_id: resolver,
    legally_conformant_unique_product_identifier: input.externalUniqueProductId || null,
    eu_registry_registration_identifier: input.euRegistrationId || null,
    data_carrier_identifier: input.dataCarrierUrl || (resolver ? `/p/${resolver}` : null),
  };
}

export const IDENTIFIER_STANDARDS_NOTE = {
  conformantToday: [
    "Persistent INTERTEXE public resolver ID (itx_…) bound to QR/data carrier URL",
    "QR encodes resolver URL only — not full passport payload",
    "Immutable published passport versions with integrity hash",
  ],
  awaitingTextileDelegatedAct: [
    "Legally conformant unique product identifier format for textiles",
    "Sector-specific data carrier encoding requirements",
    "Textile-specific access-right field mappings",
  ],
  awaitingEuStandards: [
    "Harmonised unique identifier standard selection for textiles (2 of 8 standards outstanding per Commission timeline)",
    "Registry semantic catalogue for non-battery sectors",
  ],
} as const;
