"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEMO_EXAMPLES } from "../../../lib/material-intelligence/demo-records";
import type { MaterialApiSuccess, MaterialLookupData } from "../../../lib/material-intelligence/types";
import { trackPlatform } from "../../../lib/platform-analytics";
import { SERIF } from "../platform-ui";

function evidenceLabel(status: string) {
  if (status === "verified_label") return "Verified label";
  if (status === "reported_retailer") return "Reported retailer";
  if (status === "reported_brand") return "Reported brand";
  if (status === "inferred") return "Inferred";
  return "Missing";
}

export function DemoApiProof() {
  const [query, setQuery] = useState(DEMO_EXAMPLES[0].query);
  const [record, setRecord] = useState<MaterialLookupData | null>(null);
  const [envelope, setEnvelope] = useState<MaterialApiSuccess | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lookup = useCallback(async (value: string, exampleId?: (typeof DEMO_EXAMPLES)[number]["id"]) => {
    const q = value.trim();
    if (!q) return;
    setBusy(true);
    setError("");
    setShowJson(false);
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
    } catch {
      setError("Could not reach the demonstration API.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    lookup(DEMO_EXAMPLES[0].query, "verified");
  }, [lookup]);

  const jsonText = useMemo(() => (envelope ? JSON.stringify(envelope, null, 2) : ""), [envelope]);
  const nfp = record?.composition.natural_fiber_percentage;

  return (
    <section id="api" className="scroll-mt-28 mb-16 sm:mb-24">
      <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">Technical proof</p>
      <h2 className="text-[1.75rem] sm:text-3xl font-light mb-4 max-w-xl leading-[1.15]" style={SERIF}>
        The same intelligence, available by API.
      </h2>
      <p className="text-[15px] text-[var(--platform-muted)] font-light max-w-xl mb-8">
        One search field. One elegant result card. Raw JSON stays behind a secondary action.
      </p>

      <form
        className="max-w-xl mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          lookup(query);
        }}
      >
        <label htmlFor="demo-gtin" className="sr-only">
          Sample GTIN
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="demo-gtin"
            inputMode="numeric"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sample GTIN"
            className="flex-1 rounded-full border border-[var(--platform-border)] bg-white px-5 py-3 text-[15px] outline-none focus:border-[var(--platform-primary)]"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-[var(--platform-primary)] text-white px-8 py-3 text-[11px] tracking-[0.14em] uppercase disabled:opacity-50 min-h-[48px]"
          >
            {busy ? "Looking up…" : "Look up"}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2 mb-8">
        {DEMO_EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => {
              setQuery(ex.query);
              lookup(ex.query, ex.id);
            }}
            className="text-[10px] tracking-[0.1em] uppercase px-3 py-2 rounded-full border border-[var(--platform-border)] bg-white hover:border-[var(--platform-primary)] text-[var(--platform-muted)]"
          >
            {ex.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-[#8b2e2e] mb-6">{error}</p> : null}

      {record ? (
        <article className="demo-tour-api-card max-w-2xl">
          <p className="text-[10px] tracking-[0.16em] uppercase text-[var(--platform-quiet)] mb-2">
            {record.match_type.replace(/_/g, " ")}
          </p>
          <h3 className="text-2xl font-light mb-1" style={SERIF}>
            {record.product.name || "No product match"}
          </h3>
          <p className="text-sm text-[var(--platform-muted)] mb-4">
            {[record.product.brand, record.product.gtin].filter(Boolean).join(" · ")}
          </p>

          {record.composition.components.length ? (
            <>
              <div className="flex h-2 rounded-full overflow-hidden bg-[#ebe4da] mb-4 max-w-sm">
                {record.composition.components.map((c) => (
                  <div
                    key={c.fiber_code}
                    style={{
                      width: `${c.percentage || 0}%`,
                      background: c.fiber_code === "silk" ? "#c4a574" : c.fiber_code === "cotton" ? "#d9cbb8" : "#9c7b8b",
                    }}
                  />
                ))}
              </div>
              <p className="text-lg mb-4" style={SERIF}>
                {record.composition.components.map((c) => `${c.percentage}% ${c.fiber_name}`).join(" · ")}
              </p>
              {nfp != null ? (
                <p className="text-sm text-[var(--platform-muted)] mb-4">{nfp}% natural fiber</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--platform-muted)] mb-4">{record.message}</p>
          )}

          <div className="flex flex-wrap gap-3 text-[11px] mb-6">
            <span className="px-3 py-1.5 rounded-full border border-[var(--platform-border)] bg-[#faf8f4]">
              {evidenceLabel(record.evidence.status)}
            </span>
            <span className="px-3 py-1.5 rounded-full border border-[var(--platform-border)] bg-[#faf8f4] capitalize">
              DPP · {record.dpp_alignment.status.replace(/_/g, " ")}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 items-center pt-4 border-t border-[var(--platform-border)]">
            <button
              type="button"
              onClick={() => {
                setShowJson((v) => !v);
                if (!showJson) trackPlatform("platform_demo_raw_json_viewed");
              }}
              className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-primary)] underline underline-offset-4"
            >
              {showJson ? "Hide raw JSON" : "View raw JSON"}
            </button>
            <Link href="/platform#api" className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-muted)] underline underline-offset-4">
              API documentation →
            </Link>
          </div>

          {showJson ? (
            <pre className="mt-4 overflow-x-auto bg-[#f7f3ee] p-4 rounded-xl text-[11px] leading-relaxed max-h-80">
              {jsonText}
            </pre>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
