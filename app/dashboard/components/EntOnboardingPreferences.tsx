"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ONBOARDING_COUNTRIES,
  defaultMassUnitForCountry,
  type MassUnitSystem,
  type OrganizationMeasurementPreferences,
} from "../../../lib/enterprise/org-preferences";

export function EntOnboardingPreferences({
  orgSlug,
  initial,
  variant = "onboarding",
  onSaved,
}: {
  orgSlug: string;
  initial?: Partial<OrganizationMeasurementPreferences> | null;
  variant?: "onboarding" | "settings";
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState(initial?.countryCode || "");
  const [massUnit, setMassUnit] = useState<MassUnitSystem>(
    initial?.preferredMassUnit || defaultMassUnitForCountry(initial?.countryCode)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const unitHint = useMemo(() => {
    return massUnit === "imperial"
      ? "Product weight displays in oz / lb (stored as grams)."
      : "Product weight displays in g / kg (stored as grams).";
  }, [massUnit]);

  function onCountryChange(code: string) {
    setCountryCode(code);
    setMassUnit(defaultMassUnitForCountry(code));
    setSaved(false);
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (!countryCode) {
      setError("Select a country.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard/org/${encodeURIComponent(orgSlug)}/onboarding/preferences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ countryCode, preferredMassUnit: massUnit }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save preferences.");
        return;
      }
      setSaved(true);
      onSaved?.();
      router.refresh();
    } catch {
      setError("Could not save preferences.");
    } finally {
      setSaving(false);
    }
  }

  const formClass =
    variant === "settings" ? "space-y-4" : "ent-onboarding-prefs mt-6 space-y-4";

  return (
    <form onSubmit={save} className={formClass}>
      <label className="block">
        <span className="text-xs text-white/50 uppercase tracking-[0.12em]">
          Company country
        </span>
        <select
          className="ent-select mt-2 w-full text-sm"
          value={countryCode}
          onChange={(e) => onCountryChange(e.target.value)}
          required
        >
          <option value="">Select country…</option>
          {ONBOARDING_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-xs text-white/50 uppercase tracking-[0.12em]">
          Mass units
        </legend>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-white/85">
            <input
              type="radio"
              name="massUnit"
              checked={massUnit === "metric"}
              onChange={() => {
                setMassUnit("metric");
                setSaved(false);
              }}
            />
            Metric (g / kg)
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-white/85">
            <input
              type="radio"
              name="massUnit"
              checked={massUnit === "imperial"}
              onChange={() => {
                setMassUnit("imperial");
                setSaved(false);
              }}
            />
            Imperial (oz / lb)
          </label>
        </div>
        <p className="text-xs text-white/45 mt-2">{unitHint}</p>
      </fieldset>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {saved && !error ? (
        <p className="text-sm text-white/60">Preferences saved.</p>
      ) : null}

      <button
        type="submit"
        disabled={saving || !countryCode}
        className="ent-onboarding-primary-btn"
      >
        {saving ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}

export function EntSettingsMeasurementPreferences({
  orgSlug,
  initial,
}: {
  orgSlug: string;
  initial: OrganizationMeasurementPreferences;
}) {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState(initial.countryCode || "");
  const [massUnit, setMassUnit] = useState<MassUnitSystem>(initial.preferredMassUnit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onCountryChange(code: string) {
    setCountryCode(code);
    setMassUnit(defaultMassUnitForCountry(code));
    setSaved(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!countryCode) {
      setError("Select a country.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard/org/${encodeURIComponent(orgSlug)}/onboarding/preferences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ countryCode, preferredMassUnit: massUnit }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save preferences.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not save preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 text-sm">
      <label className="block">
        <span className="text-[var(--ent-muted-light)] text-xs mb-1 block">Company country</span>
        <select
          className="ent-select w-full"
          value={countryCode}
          onChange={(e) => onCountryChange(e.target.value)}
          required
        >
          <option value="">Select country…</option>
          {ONBOARDING_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend className="text-[var(--ent-muted-light)] text-xs mb-2">Mass units</legend>
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-[var(--ent-ink-soft)]">
            <input
              type="radio"
              name="settingsMassUnit"
              checked={massUnit === "metric"}
              onChange={() => {
                setMassUnit("metric");
                setSaved(false);
              }}
            />
            Metric (g / kg)
          </label>
          <label className="inline-flex items-center gap-2 text-[var(--ent-ink-soft)]">
            <input
              type="radio"
              name="settingsMassUnit"
              checked={massUnit === "imperial"}
              onChange={() => {
                setMassUnit("imperial");
                setSaved(false);
              }}
            />
            Imperial (oz / lb)
          </label>
        </div>
        <p className="text-xs text-[var(--ent-muted)] mt-2">
          Canonical storage stays in grams. Display follows this preference on product records.
        </p>
      </fieldset>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved && !error ? <p className="text-sm text-[var(--ent-muted)]">Saved.</p> : null}
      <button type="submit" disabled={saving || !countryCode} className="ent-btn ent-btn-primary text-sm">
        {saving ? "Saving…" : "Save region & units"}
      </button>
    </form>
  );
}
