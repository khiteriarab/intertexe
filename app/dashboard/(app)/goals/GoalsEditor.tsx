"use client";

import { useState } from "react";
import { COMPANY_HORIZON_PLANS, type PlanHorizon } from "../../../../lib/dashboard/company-plan";

type EditablePlan = {
  revenueMin: number;
  revenueStretch: number;
  members: number;
  b2bClients: number;
  pressFeatures: number;
  speakingEngagements: number;
};

const STORAGE_KEY = "intertexe-hq-goals-v1";

function loadOverrides(): Partial<Record<PlanHorizon, EditablePlan>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function GoalsEditor() {
  const [horizon, setHorizon] = useState<PlanHorizon>("year2");
  const [saved, setSaved] = useState(false);
  const base = COMPANY_HORIZON_PLANS[horizon];
  const [draft, setDraft] = useState<EditablePlan>(() => {
    const overrides = loadOverrides()[horizon];
    return overrides ?? {
      revenueMin: base.revenueMin,
      revenueStretch: base.revenueStretch,
      members: base.members,
      b2bClients: base.b2bClients,
      pressFeatures: base.pressFeatures,
      speakingEngagements: base.speakingEngagements,
    };
  });

  function selectHorizon(next: PlanHorizon) {
    setHorizon(next);
    const overrides = loadOverrides()[next];
    const plan = COMPANY_HORIZON_PLANS[next];
    setDraft(
      overrides ?? {
        revenueMin: plan.revenueMin,
        revenueStretch: plan.revenueStretch,
        members: plan.members,
        b2bClients: plan.b2bClients,
        pressFeatures: plan.pressFeatures,
        speakingEngagements: plan.speakingEngagements,
      }
    );
    setSaved(false);
  }

  function save() {
    const all = loadOverrides();
    all[horizon] = draft;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setSaved(true);
  }

  if (horizon === "year1") {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <p className="text-sm text-black/55">Year 1 targets are fixed in the operating plan. Edit Year 2 or Year 3.</p>
        <div className="mt-3 inline-flex rounded-lg border border-black/10 p-1">
          {(["year2", "year3"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => selectHorizon(key)}
              className="px-3 py-1.5 text-xs rounded-md text-black/55 hover:bg-black/[0.04]"
            >
              {COMPANY_HORIZON_PLANS[key].label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-serif text-xl">Edit {COMPANY_HORIZON_PLANS[horizon].label} targets</h2>
        <div className="inline-flex rounded-lg border border-black/10 p-1">
          {(["year2", "year3"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => selectHorizon(key)}
              className={`px-3 py-1.5 text-xs rounded-md ${
                horizon === key ? "bg-black text-white" : "text-black/55 hover:bg-black/[0.04]"
              }`}
            >
              {COMPANY_HORIZON_PLANS[key].label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {(
          [
            ["revenueMin", "Revenue minimum ($)"],
            ["revenueStretch", "Revenue stretch ($)"],
            ["members", "Members"],
            ["b2bClients", "B2B clients"],
            ["pressFeatures", "Press features"],
            ["speakingEngagements", "Speaking engagements"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="text-black/55">{label}</span>
            <input
              type="number"
              value={draft[key]}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) || 0 }))}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 tabular-nums"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="px-4 py-2 text-xs tracking-wide uppercase bg-black text-white rounded-lg"
        >
          Save locally
        </button>
        {saved ? <span className="text-xs text-emerald-700">Saved — applies to Goals view</span> : null}
      </div>
    </section>
  );
}
