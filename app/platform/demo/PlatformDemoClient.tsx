"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEMO_EXAMPLES,
  PILOT_MAILTO,
  SNAPSHOT_MAILTO,
  type DemoCompositionRecord,
  type DemoExample,
} from "../../../lib/platform-demo";

const FIBER_TONE: Record<string, string> = {
  silk: "#c4a574",
  cotton: "#d9cbb8",
  linen: "#c8b89a",
  wool: "#a89278",
  cashmere: "#b7a08c",
  elastane: "#9c7b8b",
  polyester: "#8d8a86",
  nylon: "#7a7672",
};

function toneFor(fiber: string) {
  return FIBER_TONE[fiber.toLowerCase()] || "#b7aea4";
}

function provenanceCopy(status: DemoCompositionRecord["provenance"]["status"]) {
  if (status === "verified") return "Reviewed label evidence is retained for this GTIN.";
  if (status === "reported") return "Composition came from a brand or retailer source. It is not label-verified.";
  return "No product-level composition was found. Nothing was guessed.";
}

export function PlatformDemoClient() {
  const [query, setQuery] = useState(DEMO_EXAMPLES[0].query);
  const [activeExample, setActiveExample] = useState<DemoExample["id"]>("verified");
  const [record, setRecord] = useState<DemoCompositionRecord | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lookup = useCallback(async (value: string, exampleId?: DemoExample["id"]) => {
    const q = value.trim();
    if (!q) return;
    setBusy(true);
    setError("");
    setRawOpen(false);
    try {
      const res = await fetch(`/api/v1/demo/composition/${encodeURIComponent(q)}`);
      const json = (await res.json()) as DemoCompositionRecord & { error?: string };
      if (!res.ok) {
        setRecord(null);
        setError(json.error || "Lookup failed");
        return;
      }
      setRecord(json);
      if (exampleId) setActiveExample(exampleId);
      else {
        const match = DEMO_EXAMPLES.find((ex) => ex.query === q);
        if (match) setActiveExample(match.id);
      }
    } catch {
      setRecord(null);
      setError("Could not reach the demonstration API.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    lookup(DEMO_EXAMPLES[0].query, "verified");
  }, [lookup]);

  const jsonText = useMemo(() => (record ? JSON.stringify(record, null, 2) : ""), [record]);

  function downloadRecord() {
    if (!record) return;
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const id = record.product.gtin || "sample";
    a.href = url;
    a.download = `intertexe-material-record-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const nfp = record?.material_intelligence.natural_fiber_percentage;
  const mapped = record?.dpp_readiness.mapped_fields.length || 0;
  const missing = record?.dpp_readiness.missing_fields.length || 0;
  const coverage = mapped + missing > 0 ? Math.round((mapped / (mapped + missing)) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-8 py-16 md:py-24">
      <p className="text-[11px] tracking-[0.25em] text-[#9c7b8b] mb-6">MATERIAL INTELLIGENCE API</p>
      <h1
        className="text-4xl md:text-5xl font-light text-[#1a1a1a] mb-6 leading-[1.15]"
        style={{ fontFamily: "Georgia, 'Iowan Old Style', serif" }}
      >
        Send a GTIN. Receive the material record.
      </h1>
      <p className="text-lg text-[#5c5854] font-light leading-relaxed max-w-2xl mb-4">
        INTERTEXE is the material-intelligence layer for fashion. This two-minute demonstration returns
        normalized fibre composition, evidence provenance, and a DPP-readiness map — without guessing
        composition from a company prefix.
      </p>
      <p className="text-sm text-[#8a847c] mb-12 max-w-2xl">
        Read-only demonstration data. Not connected to production catalogs or credentials.
      </p>

      <form
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          lookup(query);
        }}
      >
        <label htmlFor="gtin" className="block text-[11px] tracking-[0.18em] uppercase text-[#8a847c] mb-3">
          GTIN, EAN or SKU
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="gtin"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="0123456789012"
            autoComplete="off"
            className="flex-1 bg-white border border-[#ddd5cb] px-4 py-3 text-[15px] tracking-wide outline-none focus:border-[#1a1a1a]"
          />
          <button
            type="submit"
            disabled={busy}
            className="text-[11px] tracking-[0.2em] uppercase bg-black text-white px-8 py-3 hover:bg-[#2a2a2a] disabled:opacity-50"
          >
            {busy ? "Looking up…" : "Look up"}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-14">
        {DEMO_EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => {
              setQuery(ex.query);
              lookup(ex.query, ex.id);
            }}
            className={`text-left border px-4 py-4 transition-colors ${
              activeExample === ex.id && record
                ? "border-black bg-white"
                : "border-[#ddd5cb] bg-transparent hover:border-[#1a1a1a]"
            }`}
          >
            <p className="text-[11px] tracking-[0.16em] uppercase mb-1">{ex.label}</p>
            <p className="text-sm text-[#5c5854]">{ex.subtitle}</p>
            <p className="text-xs text-[#8a847c] mt-2 font-mono">{ex.query}</p>
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-[#8b2e2e] mb-8">{error}</p> : null}

      {!record && !error ? (
        <p className="text-sm text-[#8a847c] mb-16">
          Try a barcode above, or tap an example. The three records are designed to show honesty, not a
          perfect result.
        </p>
      ) : null}

      {record ? (
        <article className="bg-white border border-[#ddd5cb] p-6 md:p-10 mb-16">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-2">
                {record.product.match_type.replace(/_/g, " ")}
              </p>
              <h2
                className="text-3xl font-light mb-2"
                style={{ fontFamily: "Georgia, 'Iowan Old Style', serif" }}
              >
                {record.product.name || "No specific product match"}
              </h2>
              <p className="text-sm text-[#5c5854]">
                {[record.product.brand, record.product.gtin, record.product.sku].filter(Boolean).join(" · ")}
              </p>
            </div>
            <ProvenanceBadge status={record.provenance.status} reviewed={record.provenance.reviewed} />
          </div>

          <section className="mb-10">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[#8a847c] mb-4">Composition</p>
            {record.composition.length ? (
              <>
                <div className="flex h-3 overflow-hidden mb-5 bg-[#ebe4da]">
                  {record.composition.map((fiber) => (
                    <div
                      key={fiber.fiber}
                      style={{ width: `${fiber.percentage}%`, background: toneFor(fiber.fiber) }}
                      title={`${fiber.fiber} ${fiber.percentage}%`}
                    />
                  ))}
                </div>
                <ul className="space-y-3">
                  {record.composition.map((fiber) => (
                    <li key={fiber.fiber} className="flex items-center justify-between gap-4 text-sm">
                      <span className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: toneFor(fiber.fiber) }}
                        />
                        <span className="capitalize tracking-wide">{fiber.fiber}</span>
                      </span>
                      <span className="tabular-nums">{fiber.percentage}%</span>
                    </li>
                  ))}
                </ul>
                {nfp != null ? (
                  <p className="mt-6 text-2xl font-light" style={{ fontFamily: "Georgia, serif" }}>
                    {nfp}% natural fiber
                    {record.material_intelligence.primary_fiber
                      ? ` · ${record.material_intelligence.primary_fiber}`
                      : ""}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-[#5c5854] leading-relaxed max-w-xl">
                Manufacturer may be identified. Composition is empty on purpose. INTERTEXE does not return
                brand-level fibre data as a verified product record.
              </p>
            )}
          </section>

          <section className="grid md:grid-cols-2 gap-10 mb-10 pt-8 border-t border-[#eee6dc]">
            <div>
              <p className="text-[11px] tracking-[0.18em] uppercase text-[#8a847c] mb-4">Provenance</p>
              <p className="text-sm leading-relaxed text-[#5c5854] mb-4">{provenanceCopy(record.provenance.status)}</p>
              <dl className="text-sm space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#8a847c]">Source</dt>
                  <dd>{record.provenance.source_type.replace(/_/g, " ")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#8a847c]">Captured</dt>
                  <dd>{record.provenance.captured_at || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#8a847c]">Reviewed</dt>
                  <dd>{record.provenance.reviewed ? "Yes" : "No"}</dd>
                </div>
              </dl>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.18em] uppercase text-[#8a847c] mb-4">DPP-readiness</p>
              <p className="text-sm mb-3 capitalize">{record.dpp_readiness.status}</p>
              <div className="h-1.5 bg-[#ebe4da] mb-3">
                <div className="h-full bg-[#9c7b8b]" style={{ width: `${coverage}%` }} />
              </div>
              <p className="text-xs text-[#8a847c] mb-4">{coverage}% of this demonstration schema is mapped</p>
              <p className="text-[11px] tracking-[0.12em] uppercase text-[#5c5854] mb-2">Mapped</p>
              <ul className="text-sm mb-4 space-y-1">
                {record.dpp_readiness.mapped_fields.length
                  ? record.dpp_readiness.mapped_fields.map((f) => (
                      <li key={f}>{f.replace(/_/g, " ")}</li>
                    ))
                  : <li className="text-[#8a847c]">None</li>}
              </ul>
              <p className="text-[11px] tracking-[0.12em] uppercase text-[#5c5854] mb-2">Missing</p>
              <ul className="text-sm space-y-1 text-[#5c5854]">
                {record.dpp_readiness.missing_fields.map((f) => (
                  <li key={f}>{f.replace(/_/g, " ")}</li>
                ))}
              </ul>
            </div>
          </section>

          <p className="text-xs leading-relaxed text-[#8a847c] mb-8">{record.notice}</p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRawOpen((v) => !v)}
              className="text-[11px] tracking-[0.16em] uppercase border border-black px-5 py-3 hover:bg-black hover:text-white transition-colors"
            >
              {rawOpen ? "Hide raw JSON" : "View raw JSON"}
            </button>
            <button
              type="button"
              onClick={downloadRecord}
              className="text-[11px] tracking-[0.16em] uppercase border border-[#ddd5cb] px-5 py-3 hover:border-black transition-colors"
            >
              Download sample record
            </button>
          </div>

          {rawOpen ? (
            <pre className="mt-6 overflow-x-auto bg-[#f7f3ee] p-4 text-xs leading-relaxed">{jsonText}</pre>
          ) : null}
        </article>
      ) : null}

      <section id="snapshot" className="border-t border-[#ddd5cb] pt-14">
        <p className="text-[11px] tracking-[0.25em] text-[#9c7b8b] mb-4">THE FIRST TRANSACTION</p>
        <h2
          className="text-3xl font-light mb-6"
          style={{ fontFamily: "Georgia, 'Iowan Old Style', serif" }}
        >
          Submit 10 products for a Material Data Snapshot.
        </h2>
        <ol className="text-sm text-[#5c5854] leading-relaxed space-y-3 mb-8 max-w-2xl">
          <li>1. Show this two-minute API demonstration.</li>
          <li>2. Send 10 GTINs or catalog rows.</li>
          <li>3. Receive a personalized Material Data Snapshot — exact matches, conflicts, missing evidence.</li>
          <li>4. Start the $5,000 Catalog Enrichment Pilot covering 500 products.</li>
        </ol>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href={SNAPSHOT_MAILTO}
            className="text-[11px] tracking-[0.2em] uppercase bg-black text-white px-8 py-4 text-center hover:bg-[#2a2a2a]"
          >
            Submit 10 products
          </a>
          <a
            href={PILOT_MAILTO}
            className="text-[11px] tracking-[0.2em] uppercase border border-black px-8 py-4 text-center hover:bg-black hover:text-white transition-colors"
          >
            Catalog Enrichment Pilot
          </a>
        </div>
        <p className="text-xs text-[#8a847c] mt-6 max-w-xl">
          The snapshot and pilot return structured material records for commerce systems and future DPP
          infrastructure. They are not legal certification.
        </p>
      </section>
    </div>
  );
}

function ProvenanceBadge({
  status,
  reviewed,
}: {
  status: DemoCompositionRecord["provenance"]["status"];
  reviewed: boolean;
}) {
  const label =
    status === "verified" ? "Verified" : status === "reported" ? "Reported" : "Not found";
  return (
    <p className="text-[11px] tracking-[0.16em] uppercase border border-[#ddd5cb] px-3 py-2">
      {label}
      {status === "verified" && reviewed ? " · reviewed" : ""}
    </p>
  );
}
