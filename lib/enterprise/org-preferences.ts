import type { SupabaseClient } from "@supabase/supabase-js";

export type MassUnitSystem = "metric" | "imperial";

export type OrganizationMeasurementPreferences = {
  countryCode: string | null;
  preferredMassUnit: MassUnitSystem;
  /** True when the brand has completed the region & units onboarding step. */
  configured: boolean;
};

/** Countries that default to imperial mass display in enterprise fashion ops. */
const IMPERIAL_COUNTRIES = new Set(["US", "LR", "MM"]);

export const ONBOARDING_COUNTRIES: Array<{ code: string; label: string }> = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "PT", label: "Portugal" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "SE", label: "Sweden" },
  { code: "DK", label: "Denmark" },
  { code: "NO", label: "Norway" },
  { code: "CH", label: "Switzerland" },
  { code: "AT", label: "Austria" },
  { code: "IE", label: "Ireland" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
  { code: "CN", label: "China" },
  { code: "IN", label: "India" },
  { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "SG", label: "Singapore" },
  { code: "ZA", label: "South Africa" },
];

export function defaultMassUnitForCountry(countryCode: string | null | undefined): MassUnitSystem {
  const code = String(countryCode || "").trim().toUpperCase();
  if (IMPERIAL_COUNTRIES.has(code)) return "imperial";
  return "metric";
}

export function parseMassUnit(value: unknown): MassUnitSystem {
  return value === "imperial" ? "imperial" : "metric";
}

/**
 * Canonical storage is grams. Format for operator UI using the org's preferred system.
 * Apparel defaults: grams under 1000g, kilograms at/above; ounces for imperial apparel weights.
 */
export function formatMassFromGrams(
  grams: number | null | undefined,
  system: MassUnitSystem = "metric"
): string | null {
  if (grams == null || Number.isNaN(grams) || grams <= 0) return null;
  if (system === "imperial") {
    const ounces = grams / 28.349523125;
    if (ounces >= 16) {
      const pounds = ounces / 16;
      return `${pounds >= 10 ? pounds.toFixed(1) : pounds.toFixed(2)} lb`;
    }
    return `${ounces >= 10 ? ounces.toFixed(1) : ounces.toFixed(2)} oz`;
  }
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg >= 10 ? kg.toFixed(1) : kg.toFixed(2)} kg`;
  }
  return `${Math.round(grams)}g`;
}

export function parseMassInputToGrams(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return raw > 0 ? raw : null;
  const text = String(raw).trim().toLowerCase();
  if (!text) return null;
  const match = text.match(/^([\d.,]+)\s*(kg|g|lb|lbs|oz)?$/i);
  if (!match) {
    const num = Number(text.replace(",", "."));
    return !Number.isNaN(num) && num > 0 ? num : null;
  }
  const amount = Number(match[1].replace(",", "."));
  if (Number.isNaN(amount) || amount <= 0) return null;
  const unit = (match[2] || "g").toLowerCase();
  if (unit === "kg") return amount * 1000;
  if (unit === "lb" || unit === "lbs") return amount * 453.59237;
  if (unit === "oz") return amount * 28.349523125;
  return amount;
}

export async function loadOrganizationMeasurementPreferences(
  client: SupabaseClient,
  organizationId: string
): Promise<OrganizationMeasurementPreferences> {
  const { data } = await client
    .from("organizations")
    .select("country_code, preferred_mass_unit, measurement_preferences")
    .eq("id", organizationId)
    .maybeSingle();

  const prefs = (data?.measurement_preferences || {}) as Record<string, unknown>;
  const countryCode = data?.country_code ? String(data.country_code).toUpperCase() : null;
  const preferredMassUnit = parseMassUnit(data?.preferred_mass_unit || prefs.preferred_mass_unit);
  const configured = Boolean(countryCode && (data?.preferred_mass_unit || prefs.configured));

  return {
    countryCode,
    preferredMassUnit: countryCode && !data?.preferred_mass_unit
      ? defaultMassUnitForCountry(countryCode)
      : preferredMassUnit,
    configured,
  };
}

export async function saveOrganizationMeasurementPreferences(
  client: SupabaseClient,
  organizationId: string,
  input: { countryCode: string; preferredMassUnit: MassUnitSystem }
): Promise<OrganizationMeasurementPreferences> {
  const countryCode = input.countryCode.trim().toUpperCase().slice(0, 2);
  const preferredMassUnit = parseMassUnit(input.preferredMassUnit);
  const measurement_preferences = {
    configured: true,
    preferred_mass_unit: preferredMassUnit,
    country_code: countryCode,
    configured_at: new Date().toISOString(),
  };

  const { error } = await client
    .from("organizations")
    .update({
      country_code: countryCode,
      preferred_mass_unit: preferredMassUnit,
      measurement_preferences,
    })
    .eq("id", organizationId);

  if (error) throw new Error(error.message || "Could not save measurement preferences.");

  return {
    countryCode,
    preferredMassUnit,
    configured: true,
  };
}
