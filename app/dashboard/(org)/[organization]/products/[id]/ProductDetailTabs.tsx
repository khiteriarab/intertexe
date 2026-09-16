"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProductImpactBundle } from "../../../../../../lib/sustainability/product-impact";
import { providerAttribution } from "../../../../../../lib/sustainability/providers";
import type { ProductImpactRecord } from "../../../../../../lib/sustainability/types";
import { entLinkClass } from "../../../../components/EnterpriseUi";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "materials", label: "Materials" },
  { id: "traceability", label: "Traceability" },
  { id: "impact", label: "Impact" },
  { id: "passport", label: "Passport" },
  { id: "circularity", label: "Circularity" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type ProductDetail = {
  id: string;
  name: string;
  sku: string | null;
  style_code: string | null;
  category: string | null;
  passport_state: string | null;
};

export function ProductDetailTabs({
  product,
  base,
  slug,
  impactBundle,
}: {
  product: ProductDetail;
  base: string;
  slug: string;
  impactBundle: ProductImpactBundle;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabId) || "overview";
  const activeTab = TABS.some((t) => t.id === tab) ? tab : "overview";

  function setTab(next: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${base}/${product.id}?${params.toString()}`, { scroll: false });
  }

  const impact = impactBundle.impact;
  const traceability = impactBundle.traceabilityScore;

  return (
    <div>
      <nav className="ent-product-tabs mb-8" aria-label="Product sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`ent-product-tab ${activeTab === item.id ? "is-active" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section className="ent-card ent-card-primary">
          <p className="ent-section-eyebrow">Product record</p>
          <h2 className="ent-section-title mt-1">{product.name}</h2>
          <dl className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
            <div><dt className="text-[var(--ent-muted-light)]">SKU</dt><dd>{product.sku || "—"}</dd></div>
            <div><dt className="text-[var(--ent-muted-light)]">Style</dt><dd>{product.style_code || "—"}</dd></div>
            <div><dt className="text-[var(--ent-muted-light)]">Category</dt><dd>{product.category || "—"}</dd></div>
            <div><dt className="text-[var(--ent-muted-light)]">Passport state</dt><dd>{product.passport_state || "—"}</dd></div>
          </dl>
        </section>
      ) : null}

      {activeTab === "materials" ? (
        <section className="ent-card ent-card-secondary p-6">
          <p className="text-sm text-[var(--ent-muted)]">Composition and material fields with canonical source attribution and approval status.</p>
          <Link href={`${base}/${product.id}`} className={`${entLinkClass} inline-flex mt-4`}>
            View normalized fields →
          </Link>
        </section>
      ) : null}

      {activeTab === "traceability" ? (
        <section className="ent-card ent-card-secondary p-6">
          <p className="ent-section-eyebrow">INTERTEXE Traceability Score</p>
          <p className="ent-card-metric mt-2">{traceability?.score ?? 0}%</p>
          <p className="text-sm text-[var(--ent-muted)] mt-2">
            Measures supply chain completeness and evidence — separate from environmental impact.
          </p>
          <Link href={`/dashboard/${slug}/traceability`} className={`${entLinkClass} inline-flex mt-4`}>
            Open traceability workspace →
          </Link>
        </section>
      ) : null}

      {activeTab === "impact" ? <ProductImpactPanel impact={impact} sourceAttribution={impactBundle.sourceAttribution} slug={slug} /> : null}

      {activeTab === "passport" ? (
        <section className="ent-card ent-card-secondary p-6">
          <p className="text-sm text-[var(--ent-muted)]">Passport publishing and carrier management.</p>
          <Link href={`/dashboard/${slug}/passports`} className={`${entLinkClass} inline-flex mt-4`}>
            Open passports →
          </Link>
        </section>
      ) : null}

      {activeTab === "circularity" ? (
        <section className="ent-card ent-card-secondary p-6">
          <p className="text-sm text-[var(--ent-muted)]">Circularity and end-of-life outputs appear when ingested from approved providers.</p>
        </section>
      ) : null}
    </div>
  );
}

function ProductImpactPanel({
  impact,
  sourceAttribution,
  slug,
}: {
  impact: ProductImpactRecord | null;
  sourceAttribution: string | null;
  slug: string;
}) {
  if (!impact) {
    return (
      <div className="ent-empty-premium">
        <div className="ent-empty-premium-visual" aria-hidden>◎</div>
        <p className="ent-empty-premium-title">No impact data linked</p>
        <p className="ent-empty-premium-body">
          Connect Worldly or Green Story to attach environmental impact to this product record.
        </p>
        <Link href={`/dashboard/${slug}/integrations`} className="ent-btn ent-btn-primary text-sm mt-2">
          Connect provider →
        </Link>
      </div>
    );
  }

  const assessment = impact.impactAssessments[0];
  const regulatory = impact.sustainabilityScores.find((s) => s.type === "french_environmental_cost");

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <MetricCard label="Carbon" value={impact.environmentalImpact.carbon} />
        <MetricCard label="Water" value={impact.environmentalImpact.water} />
        <MetricCard label="Energy" value={impact.environmentalImpact.energy} />
      </div>

      {impact.hotspots?.length ? (
        <section className="ent-card ent-card-primary">
          <p className="ent-section-eyebrow">Lifecycle hotspots</p>
          <ul className="mt-4 space-y-2">
            {impact.hotspots.map((hotspot) => (
              <li key={hotspot.stage} className="flex justify-between text-sm">
                <span>{hotspot.stage}</span>
                <span className="tabular-nums text-[var(--ent-muted)]">{hotspot.sharePct}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {regulatory ? (
        <section className="ent-card ent-card-secondary p-5">
          <p className="text-xs text-[var(--ent-muted-light)]">Regulatory environmental score</p>
          <p className="ent-kpi-value mt-2">{regulatory.value} {regulatory.unit}</p>
          <p className="text-sm text-[var(--ent-muted)] mt-1">{regulatory.label} · {regulatory.market}</p>
          <p className="text-xs text-[var(--ent-muted-light)] mt-2">
            Stored as provider regulatory output — not an INTERTEXE proprietary score.
          </p>
        </section>
      ) : null}

      <section className="ent-card ent-card-dark ent-card-primary">
        <p className="ent-section-eyebrow">Evidence & confidence</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-white/55">Source</dt>
            <dd className="text-white/90">{sourceAttribution || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/55">Confidence</dt>
            <dd className="text-white/90">{assessment ? `${assessment.confidence}%` : "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/55">Measured / estimated</dt>
            <dd className="text-white/90">
              {assessment ? `${assessment.measuredShare}% / ${assessment.estimatedShare}%` : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/55">Evidence</dt>
            <dd className="text-white/90">
              {impact.evidenceStatus
                ? `${impact.evidenceStatus.verified} of ${impact.evidenceStatus.required} verified`
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="space-y-3">
        <p className="text-sm font-medium text-[var(--ent-ink)]">All sustainability scores</p>
        {impact.sustainabilityScores.map((score) => (
          <div key={score.type} className="ent-card ent-card-secondary p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{score.label || score.type.replaceAll("_", " ")}</p>
              <p className="text-xs text-[var(--ent-muted)] mt-1">
                {score.provider === "intertexe" ? "INTERTEXE" : providerAttribution(score.provider)} · {score.status}
              </p>
            </div>
            <p className="ent-kpi-value text-xl">{score.value} <span className="text-sm">{score.unit}</span></p>
          </div>
        ))}
      </div>

      <Link href={`/dashboard/${slug}/impact`} className={entLinkClass}>
        Open org impact workspace →
      </Link>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value?: { value: number; unit: string } | null }) {
  return (
    <article className="ent-card ent-card-secondary p-5">
      <p className="text-xs text-[var(--ent-muted-light)]">{label}</p>
      <p className="ent-kpi-value mt-2">{value ? `${value.value} ${value.unit}` : "—"}</p>
    </article>
  );
}
