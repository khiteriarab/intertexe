export type PlanKey = "free_snapshot" | "founding_pilot" | "saas" | "internal";

export type EntitlementSnapshot = {
  plan: PlanKey;
  productAllowance: number | null;
  passportAllowance: number | null;
  canPublishPassports: boolean;
  canUseSuppliers: boolean;
  canUseApi: boolean;
  canBenchmark: boolean;
  canExportUnlimited: boolean;
  canUseIntegrations: boolean;
  canUseRegulatoryProgram: boolean;
};

export function entitlementsForPlan(plan: PlanKey, overrides?: {
  productAllowance?: number | null;
  passportAllowance?: number | null;
}): EntitlementSnapshot {
  const productAllowance = overrides?.productAllowance;
  const passportAllowance = overrides?.passportAllowance;
  if (plan === "internal" || plan === "saas") {
    return {
      plan,
      productAllowance: productAllowance ?? null,
      passportAllowance: passportAllowance ?? null,
      canPublishPassports: true,
      canUseSuppliers: true,
      canUseApi: true,
      canBenchmark: true,
      canExportUnlimited: true,
      canUseIntegrations: true,
      canUseRegulatoryProgram: true,
    };
  }
  if (plan === "founding_pilot") {
    return {
      plan,
      productAllowance: productAllowance ?? 500,
      passportAllowance: passportAllowance ?? 100,
      canPublishPassports: true,
      canUseSuppliers: true,
      canUseApi: false,
      canBenchmark: false,
      canExportUnlimited: false,
      canUseIntegrations: false,
      canUseRegulatoryProgram: false,
    };
  }
  return {
    plan: "free_snapshot",
    productAllowance: productAllowance ?? 10,
    passportAllowance: passportAllowance ?? 1,
    canPublishPassports: false,
    canUseSuppliers: false,
    canUseApi: false,
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
