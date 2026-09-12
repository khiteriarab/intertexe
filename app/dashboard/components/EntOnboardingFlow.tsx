"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  type GettingStartedStep,
  isOnboardingComplete,
  onboardingStats,
} from "../../../lib/enterprise/getting-started";
import { ENT_NAV_ITEM_ICONS } from "./EnterpriseNavIcons";

function ProgressRing({ pct, size = 128 }: { pct: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="ent-onboarding-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <span className="ent-onboarding-ring-label">{pct}%</span>
    </div>
  );
}

export function EntOnboardingFlow({
  base,
  orgSlug,
  orgName,
  steps,
}: {
  base: string;
  orgSlug: string;
  orgName: string;
  steps: GettingStartedStep[];
}) {
  const router = useRouter();
  const stats = useMemo(() => onboardingStats(steps), [steps]);
  const complete = isOnboardingComplete(steps);
  const initialIndex = Math.max(0, steps.findIndex((s) => !s.done));
  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [skipping, setSkipping] = useState(false);

  const activeStep = steps[activeIndex] || stats.nextStep;
  const ActiveIcon = activeStep ? ENT_NAV_ITEM_ICONS[activeStep.icon] : ENT_NAV_ITEM_ICONS.products;

  async function skipOnboarding() {
    setSkipping(true);
    try {
      await fetch(`/api/dashboard/org/${encodeURIComponent(orgSlug)}/onboarding/skip`, {
        method: "POST",
      });
      router.push(base);
      router.refresh();
    } finally {
      setSkipping(false);
    }
  }

  if (complete) {
    return (
      <div className="ent-onboarding-page ent-onboarding-page--complete">
        <p className="ent-onboarding-kicker">INTERTEXE</p>
        <h1 className="ent-onboarding-page-title">You&apos;re set up</h1>
        <p className="ent-onboarding-lede">
          {orgName} has published passports. Continue in the workspace overview.
        </p>
        <Link href={base} className="ent-onboarding-primary-btn ent-onboarding-primary-btn--inline">
          Go to workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="ent-onboarding-page">
      <header className="ent-onboarding-page-header">
        <p className="ent-onboarding-kicker">Set up INTERTEXE</p>
        <h1 className="ent-onboarding-page-title">Let&apos;s start building your product program</h1>
        <p className="ent-onboarding-lede">
          {orgName} · import catalog, govern material data, resolve issues, then publish passports.
        </p>
      </header>

      <div className="ent-onboarding-hero-card">
        <div className="ent-onboarding-hero-grid">
          <div className="ent-onboarding-hero-copy">
            <h2 className="ent-onboarding-serif-title">Let&apos;s get up and running</h2>
            <p className="ent-onboarding-hero-body">
              You&apos;ll import your catalog, review governed fields, clear issues, then publish live passports.
              Each step links directly into the workspace — no separate setup project required.
            </p>
            <ul className="ent-onboarding-meta">
              <li>
                <span className="ent-onboarding-meta-icon" aria-hidden>
                  ▤
                </span>
                {stats.remainingTasks} {stats.remainingTasks === 1 ? "task" : "tasks"} left
              </li>
              <li>
                <span className="ent-onboarding-meta-icon" aria-hidden>
                  ◷
                </span>
                {stats.remainingMinutes} minutes to go
              </li>
            </ul>
          </div>
          <div className="ent-onboarding-hero-ring">
            <ProgressRing pct={stats.progressPct} />
          </div>
        </div>
      </div>

      {activeStep ? (
        <section className="ent-onboarding-step-section">
          <div className="ent-onboarding-step-card">
            <div className="ent-onboarding-step-card-head">
              <span className="ent-onboarding-step-card-icon">
                <ActiveIcon className="h-5 w-5" />
              </span>
              <div className="ent-onboarding-step-card-copy">
                <p className="ent-onboarding-step-kicker">
                  Step {activeIndex + 1} of {steps.length}
                  {activeStep.done ? " · Complete" : ""}
                </p>
                <h3 className="ent-onboarding-step-title">{activeStep.title}</h3>
                <p className="ent-onboarding-step-body">{activeStep.body}</p>
              </div>
            </div>

            <ul className="ent-onboarding-checklist">
              {activeStep.checklist.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <div className="ent-onboarding-step-actions">
              <Link href={`${base}${activeStep.href}`} className="ent-onboarding-primary-btn">
                {activeStep.label}
              </Link>
              {activeIndex < steps.length - 1 ? (
                <button type="button" onClick={() => setActiveIndex((i) => i + 1)} className="ent-onboarding-secondary-btn">
                  Preview next step
                </button>
              ) : null}
            </div>
          </div>

          <div className="ent-onboarding-dots" role="tablist" aria-label="Onboarding steps">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`${step.title}${step.done ? ", complete" : ""}`}
                onClick={() => setActiveIndex(index)}
                className={`ent-onboarding-dot ${index === activeIndex ? "is-active" : ""} ${step.done ? "is-done" : ""}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <footer className="ent-onboarding-footer">
        <button type="button" onClick={skipOnboarding} disabled={skipping} className="ent-onboarding-skip">
          {skipping ? "Skipping…" : "Skip for now — go to workspace"}
        </button>
        <Link href={base} className="ent-onboarding-footer-link">
          Workspace overview →
        </Link>
      </footer>
    </div>
  );
}
