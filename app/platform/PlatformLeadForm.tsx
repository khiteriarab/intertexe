"use client";

import { FormEvent, useState } from "react";
import {
  leadModulesSummary,
  type PricingModuleKey,
} from "../../lib/enterprise/pricing-modules";
import { trackPlatform } from "../../lib/platform-analytics";

const INTENTS = [
  { value: "snapshot", label: "Start with 10 products (pilot workspace)" },
  { value: "founding_pilot", label: "Implementation & onboarding" },
  { value: "saas", label: "Professional, Platform, or Enterprise" },
] as const;

const LEAD_INTENTS = new Set([
  "snapshot",
  "founding_pilot",
  "saas",
  "api_access",
  "enterprise",
  "ebook",
]);

const COMPANY_TYPES = [
  { value: "brand", label: "Fashion or textile brand" },
  { value: "retailer", label: "Retailer / wholesaler" },
  { value: "supplier", label: "Manufacturer / supplier" },
  { value: "other", label: "Other" },
] as const;

const FIELD =
  "mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-3 text-base sm:text-sm text-[#1a1a1a]";
const LABEL = "text-[11px] tracking-[0.14em] uppercase text-[#8a847c]";

function resolveLeadIntent(intent: string) {
  if (LEAD_INTENTS.has(intent)) return intent;
  return "snapshot";
}

export function PlatformLeadForm({
  intent = "snapshot",
  sourceCta,
  tier,
  modules = [],
  variant = "default",
}: {
  intent?: string;
  sourceCta: string;
  tier?: string;
  modules?: PricingModuleKey[];
  variant?: "default" | "demo" | "request" | "office";
}) {
  const [state, setState] = useState<"idle" | "submitting" | "done" | "dup" | "error">("idle");
  const [message, setMessage] = useState("");
  const [selectedIntent, setSelectedIntent] = useState(resolveLeadIntent(intent));
  const modulesSummary = leadModulesSummary(modules);
  const modulesParam = modules.length ? modules.join(",") : "";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting" || state === "done" || state === "dup") return;
    setState("submitting");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const submitIntent = resolveLeadIntent(selectedIntent);
    try {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          intent: submitIntent,
          source_cta: sourceCta,
          tier: tier || payload.tier || undefined,
          modules: modulesParam || payload.modules || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMessage(json.error || "Could not send this request.");
        return;
      }
      if (submitIntent === "founding_pilot") trackPlatform("platform_pilot_submitted");
      else if (submitIntent === "saas" || submitIntent === "api_access" || submitIntent === "enterprise") {
        trackPlatform("platform_api_access_submitted");
      } else trackPlatform("platform_snapshot_submitted");
      setState(json.duplicate ? "dup" : "done");
    } catch {
      setState("error");
      setMessage("Could not send this request.");
    }
  }

  const demo = variant === "demo";
  const request = variant === "request";
  const office = variant === "office";
  const expanded = demo || request;

  if (state === "done" || state === "dup") {
    return (
      <p className="text-sm text-[#5c5854] leading-relaxed">
        {office
          ? "We received your message. The INTERTEXE platform team will reply shortly."
          : "We received your request. The INTERTEXE team in Barcelona will review your catalog profile and reply with the next step."}
        {state === "dup" ? " This email was already received in the last 24 hours." : ""}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`grid gap-4 ${expanded || office ? "" : "max-w-xl"}`}>
      <input name="company_fax" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <input type="hidden" name="intent" value={selectedIntent} />
      {tier ? <input type="hidden" name="tier" value={tier} /> : null}
      {modulesParam ? <input type="hidden" name="modules" value={modulesParam} /> : null}

      {modulesSummary ? (
        <div className="rounded-sm border border-[#e8e3da] bg-[#faf8f4] px-3 py-3">
          <p className={LABEL}>Pricing selection</p>
          <p className="mt-2 text-sm text-[#161513] leading-relaxed">{modulesSummary}</p>
        </div>
      ) : tier ? (
        <div className="rounded-sm border border-[#e8e3da] bg-[#faf8f4] px-3 py-3">
          <p className={LABEL}>Plan interest</p>
          <p className="mt-2 text-sm text-[#161513] leading-relaxed capitalize">{tier}</p>
        </div>
      ) : null}

      {office ? (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className={LABEL}>
              First name*
              <input required name="first_name" autoComplete="given-name" className={FIELD} />
            </label>
            <label className={LABEL}>
              Last name*
              <input required name="last_name" autoComplete="family-name" className={FIELD} />
            </label>
            <label className={LABEL}>
              Work email*
              <input required type="email" name="email" autoComplete="email" className={FIELD} />
            </label>
            <label className={LABEL}>
              Company*
              <input required name="company" autoComplete="organization" className={FIELD} />
            </label>
          </div>
          <label className={LABEL}>
            Message
            <textarea
              name="message"
              rows={4}
              placeholder="How can we help?"
              className={`${FIELD} resize-y min-h-[112px]`}
            />
          </label>
        </>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className={LABEL}>
              First name*
              <input required name="first_name" autoComplete="given-name" className={FIELD} />
            </label>
            <label className={LABEL}>
              Last name*
              <input required name="last_name" autoComplete="family-name" className={FIELD} />
            </label>
            <label className={LABEL}>
              Company*
              <input required name="company" autoComplete="organization" className={FIELD} />
            </label>
            <label className={LABEL}>
              Work email*
              <input required type="email" name="email" autoComplete="email" className={FIELD} />
            </label>
            {expanded ? (
              <>
                <label className={LABEL}>
                  Phone
                  <input name="phone" type="tel" autoComplete="tel" className={FIELD} />
                </label>
                <label className={LABEL}>
                  Job position
                  <input name="role" autoComplete="organization-title" className={FIELD} />
                </label>
                <label className={LABEL}>
                  Country / region
                  <input name="country" autoComplete="country-name" className={FIELD} />
                </label>
                <label className={LABEL}>
                  Approximate product count
                  <input name="product_count" placeholder="e.g. 400" className={FIELD} />
                </label>
              </>
            ) : null}
          </div>
        </>
      )}
      {office ? null : expanded ? (
        <fieldset>
          <legend className={`${LABEL} mb-3`}>Company type</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {COMPANY_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex items-start gap-2 text-sm text-[#161513] font-normal normal-case tracking-normal"
              >
                <input type="radio" name="company_type" value={type.value} className="mt-1" />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {office ? null : expanded ? null : (
        <>
          <label className={LABEL}>
            Role
            <input name="role" className={FIELD} />
          </label>
          <label className={LABEL}>
            Approximate product count
            <input name="product_count" placeholder="e.g. 400" className={FIELD} />
          </label>
        </>
      )}
      {request ? (
        <>
          <label className={LABEL}>
            Message
            <textarea
              name="message"
              rows={4}
              placeholder="Tell us about your catalog, timeline, or what you want to evaluate."
              className={`${FIELD} resize-y min-h-[112px]`}
            />
          </label>
          <label className={LABEL}>
            Sell or plan to sell into the EU?
            <select name="sells_into_eu" className={FIELD} defaultValue="">
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="planning">Planning to</option>
              <option value="no">No</option>
            </select>
          </label>
        </>
      ) : null}
      {office || request ? null : (
        <>
          <label className={LABEL}>
            Company website
            <input name="company_website" className={FIELD} />
          </label>
          <label className={LABEL}>
            Sell or plan to sell into the EU?
            <select name="sells_into_eu" className={FIELD}>
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="planning">Planning to</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className={LABEL}>
            Current catalog system or file format (optional)
            <input name="catalog_system" placeholder="PIM, CSV, Shopify…" className={FIELD} />
          </label>
          <label className={LABEL}>
            What you want to evaluate
            <select
              value={selectedIntent}
              onChange={(e) => setSelectedIntent(e.target.value)}
              className={FIELD}
            >
              {INTENTS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <p className="text-xs text-[#8a847c] leading-relaxed">
        Do not attach confidential catalogs here. We arrange secure transfer after qualification. See{" "}
        <a href="/privacy" className="underline">
          Privacy
        </a>{" "}
        and{" "}
        <a href="/terms" className="underline">
          Terms
        </a>
        .
      </p>
      {state === "error" ? <p className="text-sm text-[#8b2e2e]">{message}</p> : null}
      <button
        type="submit"
        disabled={state === "submitting"}
        className="text-[11px] tracking-[0.2em] uppercase bg-[var(--platform-primary)] text-white px-8 py-4 min-h-[44px] disabled:opacity-50 hover:bg-[var(--platform-primary-hover)]"
      >
        {state === "submitting"
          ? "Sending…"
          : office
            ? "Send message"
            : request
              ? "Request a demo"
              : demo
                ? "Start with 10 products"
                : "Submit request"}
      </button>
    </form>
  );
}
