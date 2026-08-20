"use client";

import { useMemo, useState } from "react";
import {
  DEMO_CATALOG,
  DEMO_CATALOG_NOTICE,
  DEMO_ISSUE_LABEL,
  DEMO_WORKFLOW,
  demoCatalogStats,
  demoIssueSummary,
  type DemoCatalogProduct,
  type DemoWorkflowId,
} from "../../../lib/material-intelligence/demo-catalog";
import { Frame, SERIF } from "../platform-ui";
import { PlatformGraphic } from "../PlatformGraphic";

const PEER: Record<string, string> = {
  catalogNatural: "48%",
  catalogSynthetic: "52%",
  catalogSilk: "9%",
  catalogComplete: "73%",
  catalogReady: "41%",
};

export function DemoCatalogWalkthrough() {
  const [step, setStep] = useState<DemoWorkflowId>("source");
  const [selectedId, setSelectedId] = useState(DEMO_CATALOG[0].id);
  const selected = DEMO_CATALOG.find((product) => product.id === selectedId) ?? DEMO_CATALOG[0];
  const stats = useMemo(() => demoCatalogStats(), []);
  const issues = useMemo(() => demoIssueSummary(), []);

  return (
    <section className="mb-16 sm:mb-24">
      <p className="text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.25em] text-[#9c7b8b] mb-3">
        INTERTEXE DEMONSTRATION
      </p>
      <h1
        className="text-[2rem] sm:text-4xl md:text-5xl font-light mb-5 sm:mb-6 leading-[1.15]"
        style={SERIF}
      >
        See INTERTEXE with a 10-product catalog.
      </h1>
      <p className="text-base sm:text-lg text-[#5c5854] font-light leading-relaxed max-w-2xl mb-4">
        Messy source data → normalization → issues → material intelligence → benchmarking → DPP readiness →
        passport.
      </p>
      <p className="text-sm text-[#8a847c] leading-relaxed max-w-2xl mb-8">{DEMO_CATALOG_NOTICE}</p>

      <div
        role="tablist"
        aria-label="Demonstration workflow"
        className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 mb-6 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {DEMO_WORKFLOW.map((item, index) => {
          const active = item.id === step;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStep(item.id)}
              className={`snap-start shrink-0 text-[10px] tracking-[0.12em] uppercase px-3 py-2 min-h-[40px] border ${
                active
                  ? "bg-[#1d4734] text-white border-[#1d4734]"
                  : "bg-transparent text-[#6f6a63] border-[#e8e3da]"
              }`}
            >
              {String(index + 1).padStart(2, "0")} {item.label}
            </button>
          );
        })}
      </div>

      {step === "source" ? <PlatformGraphic slot="demoSource" className="mb-6" /> : null}
      {step === "normalized" ? <PlatformGraphic slot="demoNormalized" className="mb-6" /> : null}
      {step === "issues" ? <PlatformGraphic slot="understandIssues" className="mb-6" /> : null}
      {step === "intelligence" ? <PlatformGraphic slot="demoIntelligence" className="mb-6" /> : null}
      {step === "benchmark" ? <PlatformGraphic slot="compareBenchmark" className="mb-6" /> : null}
      {step === "passports" ? <PlatformGraphic slot="actPassport" className="mb-6" /> : null}

      {step === "source" || step === "normalized" ? (
        <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
          <ProductList selectedId={selected.id} onSelect={setSelectedId} />
          <Frame label={selected.sku}>
            {step === "source" ? <SourcePanel product={selected} /> : <NormalizedPanel product={selected} />}
          </Frame>
        </div>
      ) : null}

      {step === "issues" ? (
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
          <Frame label="Issues Inbox">
            <ul className="divide-y divide-[#eeeae4]">
              {issues.map((row) => (
                <li key={row.kind} className="flex justify-between gap-4 py-3 text-sm">
                  <span>{row.label}</span>
                  <span className="text-[#8a847c] tabular-nums">
                    {row.count} · {row.skus.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#8a847c] mt-4">
              {stats.issueCount} of {stats.products} products require attention. Click a product to inspect the
              record.
            </p>
          </Frame>
          <ProductList
            selectedId={selected.id}
            onSelect={setSelectedId}
            emphasize={(product) => product.issues.length > 0}
          />
        </div>
      ) : null}

      {step === "intelligence" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#e8e3da] border border-[#e8e3da] mb-6">
          {[
            [String(stats.products), "Products"],
            [String(stats.issueCount), "Require attention"],
            [stats.natural == null ? "—" : `${stats.natural}%`, "Avg. natural fiber"],
            [String(stats.readyCount), "Passport ready"],
          ].map(([n, label]) => (
            <div key={label} className="bg-white p-5">
              <p className="text-2xl font-light tabular-nums" style={SERIF}>
                {n}
              </p>
              <p className="text-[11px] tracking-[0.1em] uppercase text-[#8a847c] mt-2">{label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {step === "intelligence" ? (
        <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
          <ProductList selectedId={selected.id} onSelect={setSelectedId} />
          <Frame label="Material Intelligence">
            <NormalizedPanel product={selected} />
          </Frame>
        </div>
      ) : null}

      {step === "benchmark" ? (
        <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-8">
          <div>
            <p className="text-[11px] tracking-[0.16em] uppercase text-[#1d4734] mb-4">Your material position</p>
            <div className="overflow-x-auto border border-[#e8e3da] bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e8e3da] text-[10px] tracking-[0.12em] uppercase text-[#8a847c]">
                    <th className="py-3 px-4 font-medium">Metric</th>
                    <th className="py-3 px-4 font-medium">This catalog</th>
                    <th className="py-3 px-4 font-medium">Peer group</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Natural fiber share", stats.natural == null ? "—" : `${stats.natural}%`, PEER.catalogNatural],
                    [
                      "Synthetic share",
                      stats.synthetic == null ? "—" : `${stats.synthetic}%`,
                      PEER.catalogSynthetic,
                    ],
                    ["Silk assortment", `${stats.silkShare}%`, PEER.catalogSilk],
                    ["Complete material data", `${stats.complete}%`, PEER.catalogComplete],
                    ["Passport ready", `${stats.ready}%`, PEER.catalogReady],
                  ].map(([metric, you, peer]) => (
                    <tr key={metric} className="border-b border-[#eeeae4] last:border-0">
                      <td className="py-3 px-4">{metric}</td>
                      <td className="py-3 px-4 tabular-nums" style={SERIF}>
                        {you}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-[#5c5854]">{peer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#8a847c] mt-3">
              Illustrative peer medians. This catalog&apos;s figures are computed from the 10 sample products.
              Individual customer data is never exposed.
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.16em] uppercase text-[#9c7b8b] mb-2">Coming / developing</p>
            <p className="text-[11px] tracking-[0.16em] uppercase text-[#8a847c] mb-4">INTERTEXE consumer signal</p>
            <ul className="border border-[#e8e3da] bg-white divide-y divide-[#e8e3da]">
              {[
                ["Silk demand", "↑ 18%"],
                ["Linen demand", "↑ 11%"],
                ["Polyester engagement", "↓ 7%"],
              ].map(([label, delta]) => (
                <li key={label} className="flex justify-between gap-4 px-5 py-4 text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums text-[#1d4734]">{delta}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-[#5c5854] mt-4 leading-relaxed">
              Consumer demand is not a live statistical product yet. The figures above are illustrative.
            </p>
          </div>
        </div>
      ) : null}

      {step === "passports" ? (
        <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
          <ProductList
            selectedId={selected.id}
            onSelect={setSelectedId}
            emphasize={(product) => product.passport.status !== "ready"}
          />
          <Frame label="Passport readiness">
            <p className="text-[10px] tracking-[0.14em] uppercase text-[#1d4734] mb-2">
              {selected.passport.status === "ready"
                ? "Ready to publish"
                : selected.passport.status === "review"
                  ? "Review required"
                  : "Needs additional information"}
            </p>
            <p className="text-lg mb-4" style={SERIF}>
              {selected.name}
            </p>
            {selected.passport.missing.length ? (
              <ul className="text-sm text-[#5c5854] space-y-2 mb-4">
                {selected.passport.missing.map((field) => (
                  <li key={field}>{field.replace(/_/g, " ")}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#5c5854] mb-4">
                Required fields present on this sample record. Publish would generate the passport, persistent
                identity and QR from the same data.
              </p>
            )}
            <p className="text-xs text-[#8a847c]">
              {stats.readyCount} of {stats.products} sample products are passport-ready. INTERTEXE does not
              fabricate missing fields.
            </p>
          </Frame>
        </div>
      ) : null}
    </section>
  );
}

function ProductList({
  selectedId,
  onSelect,
  emphasize,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  emphasize?: (product: DemoCatalogProduct) => boolean;
}) {
  return (
    <div className="border border-[#e8e3da] bg-white divide-y divide-[#eeeae4]">
      {DEMO_CATALOG.map((product) => {
        const active = product.id === selectedId;
        const flagged = emphasize ? emphasize(product) : product.issues.length > 0;
        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onSelect(product.id)}
            className={`w-full text-left px-4 py-3 min-h-[52px] ${active ? "bg-[#f7f5f1]" : "bg-white"}`}
          >
            <div className="flex justify-between gap-3">
              <span className="text-sm">{product.name}</span>
              <span className="text-[10px] tracking-[0.12em] uppercase text-[#8a847c] shrink-0">
                {flagged
                  ? (product.issues[0] ? DEMO_ISSUE_LABEL[product.issues[0]] : product.passport.status)
                  : product.sku}
              </span>
            </div>
            <p className="text-xs font-mono text-[#8a847c] mt-1">{product.source.main}</p>
          </button>
        );
      })}
    </div>
  );
}

function SourcePanel({ product }: { product: DemoCatalogProduct }) {
  return (
    <>
      <p className="text-[10px] tracking-[0.16em] uppercase text-[#8a847c] mb-3">Submitted</p>
      <p className="text-lg mb-3" style={SERIF}>
        {product.name}
      </p>
      <p className="font-mono text-[13px] mb-2">{product.source.main}</p>
      {product.source.lining ? <p className="font-mono text-[13px] mb-2">Lining: {product.source.lining}</p> : null}
      {product.source.supplier ? (
        <p className="text-sm text-[#5c5854] mb-2">Supplier: {product.source.supplier}</p>
      ) : (
        <p className="text-sm text-[#5c5854] mb-2">Supplier: blank</p>
      )}
      <p className="text-sm text-[#5c5854] mb-2">
        Country of origin: {product.source.origin || "blank"}
      </p>
      <p className="text-sm text-[#5c5854] mb-2">
        Identifier: {product.source.identifier || "blank"}
      </p>
      {product.source.extra ? <p className="text-sm text-[#5c5854]">{product.source.extra}</p> : null}
    </>
  );
}

function NormalizedPanel({ product }: { product: DemoCatalogProduct }) {
  return (
    <>
      <p className="text-[10px] tracking-[0.16em] uppercase text-[#1d4734] mb-3">INTERTEXE</p>
      <p className="text-lg mb-3" style={SERIF}>
        {product.name}
      </p>
      <p className="text-[11px] tracking-[0.12em] uppercase text-[#8a847c]">Shell</p>
      <p className="text-sm mb-3">{product.normalized.shell}</p>
      {product.normalized.lining ? (
        <>
          <p className="text-[11px] tracking-[0.12em] uppercase text-[#8a847c]">Lining</p>
          <p className="text-sm mb-3">{product.normalized.lining}</p>
        </>
      ) : null}
      <p className="text-[11px] tracking-[0.12em] uppercase text-[#8a847c]">Manufacturing country</p>
      <p className="text-sm mb-3">{product.normalized.origin || "Missing"}</p>
      <p className="text-xs text-[#8a847c]">
        Source retained · {product.normalized.confidence === "high" ? "Normalized" : "Review required"} · INTERTEXE
        does not overwrite the original string
      </p>
    </>
  );
}
