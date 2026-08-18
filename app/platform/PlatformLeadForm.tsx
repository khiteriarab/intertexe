"use client";

import { FormEvent, useState } from "react";
import { trackPlatform } from "../../lib/platform-analytics";

const INTENTS = [
  { value: "snapshot", label: "10-product Material Data Snapshot" },
  { value: "founding_pilot", label: "Founding Material Data Pilot ($5,000)" },
  { value: "api_access", label: "Discuss API access" },
] as const;

export function PlatformLeadForm({
  intent = "snapshot",
  sourceCta,
}: {
  intent?: string;
  sourceCta: string;
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
        We received your request. The INTERTEXE team will review your catalog profile and reply with the
        next step for a 10-product Material Data Snapshot.
        {state === "dup" ? " This email was already received in the last 24 hours." : ""}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 max-w-xl">
      <input name="company_fax" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-[11px] tracking-[0.14em] uppercase text-[#8a847c]">
          First name
          <input required name="first_name" className="mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-2 text-sm text-[#1a1a1a]" />
        </label>
        <label className="text-[11px] tracking-[0.14em] uppercase text-[#8a847c]">
          Last name
          <input required name="last_name" className="mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-2 text-sm text-[#1a1a1a]" />
        </label>
      </div>
      <label className="text-[11px] tracking-[0.14em] uppercase text-[#8a847c]">
        Work email
        <input required type="email" name="email" className="mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-2 text-sm text-[#1a1a1a]" />
      </label>
      <label className="text-[11px] tracking-[0.14em] uppercase text-[#8a847c]">
        Company
        <input required name="company" className="mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-2 text-sm text-[#1a1a1a]" />
      </label>
      <label className="text-[11px] tracking-[0.14em] uppercase text-[#8a847c]">
        Role
        <input name="role" className="mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-2 text-sm text-[#1a1a1a]" />
      </label>
      <label className="text-[11px] tracking-[0.14em] uppercase text-[#8a847c]">
        Company website
        <input name="company_website" className="mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-2 text-sm text-[#1a1a1a]" />
      </label>
      <label className="text-[11px] tracking-[0.14em] uppercase text-[#8a847c]">
        Approximate product count
        <input name="product_count" placeholder="e.g. 400" className="mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-2 text-sm text-[#1a1a1a]" />
      </label>
      <label className="text-[11px] tracking-[0.14em] uppercase text-[#8a847c]">
        Sell or plan to sell into the EU?
        <select name="sells_into_eu" className="mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-2 text-sm text-[#1a1a1a]">
          <option value="">Select</option>
          <option value="yes">Yes</option>
          <option value="planning">Planning to</option>
          <option value="no">No</option>
        </select>
      </label>
      <label className="text-[11px] tracking-[0.14em] uppercase text-[#8a847c]">
        Current catalog system or file format (optional)
        <input name="catalog_system" placeholder="PIM, CSV, Shopify…" className="mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-2 text-sm text-[#1a1a1a]" />
      </label>
      <label className="text-[11px] tracking-[0.14em] uppercase text-[#8a847c]">
        What they want to evaluate
        <select
          value={selectedIntent}
          onChange={(e) => setSelectedIntent(e.target.value)}
          className="mt-2 w-full bg-white border border-[#ddd5cb] px-3 py-2 text-sm text-[#1a1a1a]"
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
        className="text-[11px] tracking-[0.2em] uppercase bg-black text-white px-8 py-4 disabled:opacity-50"
      >
        {state === "submitting" ? "Sending…" : "Submit request"}
      </button>
    </form>
  );
}
