"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GettingStartedStep } from "../../../lib/enterprise/getting-started";
import { ENT_NAV_ITEM_ICONS } from "./EnterpriseNavIcons";

export function EntGettingStarted({
  base,
  orgSlug,
  steps,
}: {
  base: string;
  orgSlug: string;
  steps: GettingStartedStep[];
}) {
  const storageKey = `ent-onboarding-dismissed-${orgSlug}`;
  const [dismissed, setDismissed] = useState(false);
  const completed = steps.filter((s) => s.done).length;
  const progress = Math.round((completed / steps.length) * 100);
  const nextStep = steps.find((s) => !s.done) || steps[steps.length - 1];

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (dismissed) return null;

  const NextIcon = ENT_NAV_ITEM_ICONS[nextStep.icon];

  return (
    <section className="mb-10 md:mb-12">
      <div className="ent-onboarding-card">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-12">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="ent-section-eyebrow text-white/50">Getting started</p>
                <h2 className="ent-onboarding-title">Your passport workflow</h2>
                <p className="text-sm text-white/65 mt-3 max-w-xl leading-relaxed">
                  A guided path from catalog import to published passports. Assign stage owners anytime under Workflows.
                </p>
              </div>
              <button type="button" onClick={dismiss} className="ent-onboarding-dismiss shrink-0">
                Dismiss
              </button>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                <span>
                  {completed} of {steps.length} complete
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <ol className="mt-8 space-y-3">
              {steps.map((step, index) => {
                const Icon = ENT_NAV_ITEM_ICONS[step.icon];
                return (
                  <li key={step.id}>
                    <Link
                      href={`${base}${step.href}`}
                      className={`ent-onboarding-step ${step.done ? "ent-onboarding-step-done" : ""} ${
                        !step.done && nextStep.id === step.id ? "ent-onboarding-step-active" : ""
                      }`}
                    >
                      <span className="ent-onboarding-step-num">{step.done ? "✓" : index + 1}</span>
                      <span className="ent-onboarding-step-icon">
                        <Icon className="h-[16px] w-[16px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-white/95">{step.title}</span>
                        <span className="block text-sm text-white/55 mt-0.5">{step.body}</span>
                      </span>
                      <span className="text-white/40 group-hover:text-white/70 transition-colors">→</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="lg:w-[280px] shrink-0 ent-onboarding-next">
            <p className="text-[10px] tracking-[0.14em] uppercase text-white/40">Up next</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="ent-onboarding-next-icon">
                <NextIcon className="h-[20px] w-[20px]" />
              </span>
              <p className="font-semibold text-lg text-white leading-tight">{nextStep.title}</p>
            </div>
            <p className="text-sm text-white/60 mt-3 leading-relaxed">{nextStep.body}</p>
            <Link
              href={`${base}${nextStep.href}`}
              className="mt-6 inline-flex w-full justify-center items-center rounded-xl px-5 py-3.5 text-sm font-semibold bg-white text-[var(--ent-charcoal)] hover:bg-[var(--ent-butter-soft)] transition-colors"
            >
              {nextStep.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
