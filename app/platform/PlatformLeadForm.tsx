"use client";

import { FormEvent, useState } from "react";
import { trackPlatform } from "../../lib/platform-analytics";

const INTENTS = [
  { value: "snapshot", label: "Free 10-product Material Snapshot" },
  { value: "founding_pilot", label: "Founding Pilot ($5,000)" },
  { value: "api_access", label: "Ongoing platform / API access" },
] as const;

const COMPANY_TYPES = [
  { value: "brand", label: "Fashion or textile brand" },
  { value: "retailer", label: "Retailer / wholesaler" },
  { value: "supplier", label: "Manufacturer / supplier" },
  { value: "other", label: "Other" },
] as const;

const FIELD =
  "mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-3 text-base sm:text-sm text-[#1a1a1a]";
const LABEL = "text-[11px] tracking-[0.14em] uppercase text-[#8a847c]";

export function PlatformLeadForm({
  intent = "snapshot",
  sourceCta,
  variant = "default",
}: {
  intent?: string;
  sourceCta: string;
  variant?: "default" | "demo";
}) {
  const [state, setState] = useState<"idle" | "submitting" | "done" | "dup" | "error">("idle");
  const [message, setMessage] = useState("");
  const [selectedIntent, setSelectedIntent] = useState(
    INTENTS.some((i) => i.value === intent) ? intent : "snapshot"
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting" || state === "done" || state === "dup") return;
    setState("submitting");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, intent: selectedIntent, source_cta: sourceCta }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMessage(json.error || "Could not send this request.");
        return;
      }
      if (selectedIntent === "founding_pilot") trackPlatform("platform_pilot_submitted");
      else if (selectedIntent === "api_access") trackPlatform("platform_api_access_submitted");
      else trackPlatform("platform_snapshot_submitted");
      setState(json.duplicate ? "dup" : "done");
    } catch {
      setState("error");
      setMessage("Could not send this request.");
    }
  }

  if (state === "done" || state === "dup") {
    return (
      <p className="text-sm text-[#5c5854] leading-relaxed">
        We received your request. The INTERTEXE team in Barcelona will review your catalog profile and reply
        with the next step.
        {state === "dup" ? " This email was already received in the last 24 hours." : ""}
      </p>
    );
  }

  const demo = variant === "demo";

  return (
    <form onSubmit={onSubmit} className={`grid gap-4 ${demo ? "" : "max-w-xl"}`}>
      <input name="company_fax" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
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
        {demo ? (
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
      {demo ? (
        <fieldset>
          <legend className={`${LABEL} mb-3`}>Company type</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {COMPANY_TYPES.map((type) => (
              <label key={type.value} className="flex items-start gap-2 text-sm text-[#161513] font-normal normal-case tracking-normal">
                <input type="radio" name="company_type" value={type.value} className="mt-1" />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {demo ? null : (
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
        className="text-[11px] tracking-[0.2em] uppercase bg-[#152238] text-white px-8 py-4 min-h-[44px] disabled:opacity-50 hover:bg-[#0f1a2c]"
      >
        {state === "submitting" ? "Sending…" : demo ? "Book a conversation" : "Submit request"}
      </button>
    </form>
  );
}
