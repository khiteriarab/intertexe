"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEMO_EXAMPLES,
} from "../../../lib/material-intelligence/demo-records";
import type { MaterialApiSuccess, MaterialLookupData } from "../../../lib/material-intelligence/types";
import { trackPlatform } from "../../../lib/platform-analytics";
import { DemoCatalogWalkthrough } from "./DemoCatalogWalkthrough";

const FIBER_TONE: Record<string, string> = {
  silk: "#c4a574",
  cotton: "#d9cbb8",
  elastane: "#9c7b8b",
};

function evidenceLabel(status: string) {
  if (status === "verified_label") return "Verified label (illustrative)";
  if (status === "reported_retailer") return "Reported retailer";
  if (status === "reported_brand") return "Reported brand";
  if (status === "inferred") return "Inferred";
  if (status === "unknown_legacy") return "Unknown legacy";
  return "Missing";
}

export function PlatformDemoClient() {
  const [query, setQuery] = useState(DEMO_EXAMPLES[0].query);
  const [active, setActive] = useState<(typeof DEMO_EXAMPLES)[number]["id"]>("verified");
  const [record, setRecord] = useState<MaterialLookupData | null>(null);
  const [envelope, setEnvelope] = useState<MaterialApiSuccess | null>(null);
  const [tab, setTab] = useState<"result" | "json">("result");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const lookup = useCallback(async (value: string, exampleId?: (typeof DEMO_EXAMPLES)[number]["id"]) => {
    const q = value.trim();
    if (!q) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/demo/composition/${encodeURIComponent(q)}`);
      const json = (await res.json()) as MaterialApiSuccess & { error?: { message?: string } };
      if (!res.ok || !json.data) {
        setRecord(null);
        setEnvelope(null);
        setError(json.error?.message || "Lookup failed");
        return;
      }
      setEnvelope(json);
      setRecord(json.data);
      trackPlatform("platform_demo_lookup", { example: exampleId || "custom" });
      if (exampleId) setActive(exampleId);
    } catch {
      setError("Could not reach the demonstration API.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    trackPlatform("platform_demo_view");
    lookup(DEMO_EXAMPLES[0].query, "verified");
  }, [lookup]);

  const jsonText = useMemo(() => (envelope ? JSON.stringify(envelope, null, 2) : ""), [envelope]);
  const curl = `curl -sS https://www.intertexe.com/api/v1/demo/composition/${encodeURIComponent(query.trim() || DEMO_EXAMPLES[0].query)}`;

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    if (label === "curl") trackPlatform("platform_demo_curl_copied");
    setTimeout(() => setCopied(""), 1500);
  }

  function download() {
    if (!jsonText) return;
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intertexe-sample-${record?.product.gtin || "record"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    trackPlatform("platform_demo_json_downloaded");
  }

  const nfp = record?.composition.natural_fiber_percentage;
  const mapped = record?.dpp_alignment.available_fields.length || 0;
  const missing = record?.dpp_alignment.missing_fields.length || 0;
  const coverage = mapped + missing ? Math.round((mapped / (mapped + missing)) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:pt-20 md:pb-24">
      <DemoCatalogWalkthrough />

      <section className="rounded-sm border border-[#e8e3da] bg-white p-5 sm:p-8 mb-6">
      <p className="text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.25em] text-[#9c7b8b] mb-3 break-words">
        INTERTEXE MATERIAL INTELLIGENCE API
      </p>
      <h2
        className="text-[1.75rem] sm:text-3xl font-light mb-5 sm:mb-6 leading-[1.15]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Look up a sample identifier.
      </h2>
      <p className="text-base sm:text-lg text-[#5c5854] font-light leading-relaxed max-w-2xl mb-8 sm:mb-12">
        The same Material Intelligence output is available as an API. Enter a sample GTIN to see normalized fibre
        composition, evidence status and a DPP-readiness map in one structured response.
      </p>

      <form
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          lookup(query);
        }}
      >
        <label htmlFor="gtin" className="block text-[11px] tracking-[0.18em] uppercase text-[#8a847c] mb-3">
          Sample GTIN
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="gtin"
            inputMode="numeric"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-0 w-full bg-white border border-[#ddd5cb] px-4 py-3 text-base sm:text-[15px] outline-none focus:border-black"
          />
          <button
            type="submit"
            disabled={busy}
            className="text-[11px] tracking-[0.16em] sm:tracking-[0.2em] uppercase bg-black text-white px-8 py-3 disabled:opacity-50"
          >
            {busy ? "Looking up…" : "Look up"}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {DEMO_EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => {
              setQuery(ex.query);
              setTab("result");
              trackPlatform("platform_demo_example_selected", { example: ex.id });
              lookup(ex.query, ex.id);
            }}
            className={`text-left border px-4 py-4 min-h-[5.5rem] ${active === ex.id && record ? "border-black bg-white" : "border-[#ddd5cb] hover:border-black"}`}
          >
            <p className="text-[11px] tracking-[0.12em] sm:tracking-[0.14em] uppercase mb-1">{ex.label}</p>
            <p className="text-sm text-[#5c5854]">{ex.subtitle}</p>
            <p className="text-xs font-mono text-[#8a847c] mt-2 break-all">{ex.query}</p>
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-[#8b2e2e] mb-8">{error}</p> : null}

      {record ? (
        <article className="bg-white border border-[#ddd5cb] p-4 sm:p-6 md:p-10 mb-10 sm:mb-14 overflow-hidden">
          <div className="flex gap-5 mb-8 text-[11px] tracking-[0.14em] sm:tracking-[0.16em] uppercase">
            <button type="button" onClick={() => setTab("result")} className={tab === "result" ? "text-black" : "text-[#8a847c]"}>
              Result
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("json");
                trackPlatform("platform_demo_raw_json_viewed");
              }}
              className={tab === "json" ? "text-black" : "text-[#8a847c]"}
            >
              Raw JSON
            </button>
          </div>

          {tab === "json" ? (
            <pre className="overflow-x-auto bg-[#f7f3ee] p-3 sm:p-4 text-[11px] sm:text-xs leading-relaxed mb-6 max-w-full">
              {jsonText}
            </pre>
          ) : (
            <>
              <p className="text-[11px] tracking-[0.16em] uppercase text-[#9c7b8b] mb-2">{record.match_type.replace(/_/g, " ")}</p>
              <h2 className="text-2xl sm:text-3xl font-light mb-2 break-words" style={{ fontFamily: "Georgia, serif" }}>
                {record.product.name || "No product-level match"}
              </h2>
              <p className="text-sm text-[#5c5854] mb-6 break-all">
                {[record.product.brand, record.product.gtin].filter(Boolean).join(" · ")}
              </p>
              <p className="text-[11px] tracking-[0.12em] sm:tracking-[0.14em] uppercase border border-[#ddd5cb] inline-block px-3 py-2 mb-8 max-w-full">
                {evidenceLabel(record.evidence.status)}
              </p>
              <p className="text-sm text-[#5c5854] mb-8 max-w-xl">{record.message}</p>

              {record.composition.components.length ? (
                <>
                  <div className="flex h-3 bg-[#ebe4da] overflow-hidden mb-5 motion-reduce:h-auto">
                    {record.composition.components.map((c) => (
                      <div
                        key={c.fiber_code}
                        style={{
                          width: `${c.percentage || 0}%`,
                          background: FIBER_TONE[c.fiber_code] || "#b7aea4",
                        }}
                      />
                    ))}
                  </div>
                  <ul className="space-y-2 text-sm mb-6">
                    {record.composition.components.map((c) => (
                      <li key={c.fiber_code} className="flex justify-between">
                        <span>{c.fiber_name}</span>
                        <span>{c.percentage != null ? `${c.percentage}%` : "—"}</span>
                      </li>
                    ))}
                  </ul>
                  {nfp != null ? (
                    <p className="text-xl sm:text-2xl font-light mb-8" style={{ fontFamily: "Georgia, serif" }}>
                      {nfp}% natural fiber{record.composition.primary_fiber ? ` · ${record.composition.primary_fiber}` : ""}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-[#5c5854] mb-8 max-w-xl">
                  Composition is empty. INTERTEXE does not guess fibre content from a manufacturer prefix.
                </p>
              )}

              <p className="text-[11px] tracking-[0.16em] uppercase text-[#8a847c] mb-3">DPP alignment</p>
              <p className="text-sm mb-2 capitalize">{record.dpp_alignment.status}</p>
              <div className="h-1.5 bg-[#ebe4da] mb-4">
                <div className="h-full bg-[#9c7b8b]" style={{ width: `${coverage}%` }} />
              </div>
              <div className="grid md:grid-cols-2 gap-6 text-sm mb-6">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#8a847c] mb-2">Available</p>
                  <ul className="space-y-1">
                    {record.dpp_alignment.available_fields.map((f) => (
                      <li key={f}>{f.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#8a847c] mb-2">Missing</p>
                  <ul className="space-y-1 text-[#5c5854]">
                    {record.dpp_alignment.missing_fields.map((f) => (
                      <li key={f}>{f.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="text-xs text-[#8a847c] leading-relaxed">{record.dpp_alignment.notice}</p>
            </>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
            <button
              type="button"
              onClick={() => copy("json", jsonText)}
              className="text-[11px] tracking-[0.12em] sm:tracking-[0.14em] uppercase border border-black px-4 py-3 text-center"
            >
              {copied === "json" ? "Copied" : "Copy JSON"}
            </button>
            <button
              type="button"
              onClick={() => copy("curl", curl)}
              className="text-[11px] tracking-[0.12em] sm:tracking-[0.14em] uppercase border border-[#ddd5cb] px-4 py-3 text-center"
            >
              {copied === "curl" ? "Copied" : "Copy cURL"}
            </button>
            <button
              type="button"
              onClick={download}
              className="text-[11px] tracking-[0.12em] sm:tracking-[0.14em] uppercase border border-[#ddd5cb] px-4 py-3 text-center"
            >
              Download sample JSON
            </button>
            <Link
              href="/platform/docs"
              className="text-[11px] tracking-[0.12em] sm:tracking-[0.14em] uppercase px-4 py-3 underline underline-offset-4 text-center"
            >
              Documentation
            </Link>
          </div>
        </article>
      ) : null}
      </section>
    </div>
  );
}
