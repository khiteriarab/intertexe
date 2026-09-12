import { saasTierByKey, type SaasTierKey } from "./pricing";

export type PlanKey =
  | "free_snapshot"
  | "founding_pilot"
  | "platform"
  | "professional"
  | "enterprise"
  /** @deprecated Use `professional` — kept for existing org rows */
  | "saas"
  | "internal";

export type EntitlementSnapshot = {
  plan: PlanKey;
  productAllowance: number | null;
  passportAllowance: number | null;
  canPublishPassports: boolean;
  canUseSuppliers: boolean;
  canUseApi: boolean;
  canUseHeadlessApi: boolean;
  canWhiteLabel: boolean;
  canCustomDomain: boolean;
  canUseSso: boolean;
  canBenchmark: boolean;
  canExportUnlimited: boolean;
  canUseIntegrations: boolean;
  canUseRegulatoryProgram: boolean;
};

function tierEntitlements(tier: SaasTierKey, overrides?: {
  productAllowance?: number | null;
  passportAllowance?: number | null;
}): EntitlementSnapshot {
  const def = saasTierByKey(tier);
  const isEnterprise = tier === "enterprise";
  const isProfessional = tier === "professional";
  return {
    plan: tier,
    productAllowance: overrides?.productAllowance ?? def.productAllowance,
    passportAllowance: overrides?.passportAllowance ?? def.passportAllowance,
    canPublishPassports: true,
    canUseSuppliers: true,
    canUseApi: isEnterprise,
    canUseHeadlessApi: isEnterprise,
    canWhiteLabel: isProfessional || isEnterprise,
    canCustomDomain: isEnterprise,
    canUseSso: isEnterprise,
    canBenchmark: true,
    canExportUnlimited: isProfessional || isEnterprise,
    canUseIntegrations: isEnterprise,
    canUseRegulatoryProgram: true,
  };
}

export function entitlementsForPlan(
  plan: PlanKey,
  overrides?: {
    productAllowance?: number | null;
    passportAllowance?: number | null;
  }
): EntitlementSnapshot {
  if (plan === "internal") {
    return {
      plan,
      productAllowance: overrides?.productAllowance ?? null,
      passportAllowance: overrides?.passportAllowance ?? null,
      canPublishPassports: true,
      canUseSuppliers: true,
      canUseApi: true,
      canUseHeadlessApi: true,
      canWhiteLabel: true,
      canCustomDomain: true,
      canUseSso: true,
      canBenchmark: true,
      canExportUnlimited: true,
      canUseIntegrations: true,
      canUseRegulatoryProgram: true,
    };
  }
  if (plan === "enterprise") {
    return tierEntitlements("enterprise", overrides);
  }
  if (plan === "professional" || plan === "saas") {
    return { ...tierEntitlements("professional", overrides), plan };
  }
  if (plan === "platform") {
    return tierEntitlements("platform", overrides);
  }
  if (plan === "founding_pilot") {
    return {
      plan,
      productAllowance: overrides?.productAllowance ?? 500,
      passportAllowance: overrides?.passportAllowance ?? 100,
      canPublishPassports: true,
      canUseSuppliers: true,
      canUseApi: false,
      canUseHeadlessApi: false,
      canWhiteLabel: false,
      canCustomDomain: false,
      canUseSso: false,
      canBenchmark: false,
      canExportUnlimited: false,
      canUseIntegrations: false,
      canUseRegulatoryProgram: false,
    };
  }
  return {
    plan: "free_snapshot",
    productAllowance: overrides?.productAllowance ?? 10,
    passportAllowance: overrides?.passportAllowance ?? 1,
    canPublishPassports: false,
    canUseSuppliers: false,
    canUseApi: false,
    canUseHeadlessApi: false,
    canWhiteLabel: false,
    canCustomDomain: false,
    canUseSso: false,
    canBenchmark: false,
    canExportUnlimited: false,
    canUseIntegrations: false,
    canUseRegulatoryProgram: false,
  };
}

export function canAddProducts(entitlement: EntitlementSnapshot, currentCount: number): boolean {
  if (entitlement.productAllowance == null) return true;
  return currentCount < entitlement.productAllowance;
}
