"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { TraceabilityDashboardData } from "../../../../../lib/enterprise/traceability";
import { countryFlagEmoji } from "../../../../../lib/enterprise/issue-ui";
import {
  EntProductPlaceholder,
  entButtonClass,
  entLinkClass,
  entSelectClass,
} from "../../../components/EnterpriseUi";

type Props = {
  data: TraceabilityDashboardData;
  slug: string;
  period?: string;
};

const PERIODS = [
  { value: "12m", label: "Last 12 months" },
  { value: "90d", label: "Last 90 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const STAGE_ICONS: Record<string, string> = {
  raw_material: "◆",
  processing: "◎",
  fabric_mill: "▣",
  garment_assembly: "✦",
  product: "▢",
  passport: "⬡",
};

const CATEGORY_ICONS: Record<string, string> = {
  Knitwear: "🧶",
  Tops: "👕",
  Trousers: "👖",
  Skirts: "◠",
  Skirt: "◠",
  Accessories: "👜",
  Shirt: "👔",
  "Apparel & Accessories": "◈",
};

function DonutChart({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ent-trace-donut" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(26,31,34,0.08)" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--ent-gold-deep, #9a7b4f)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function StatusBadge({ status }: { status: "good" | "progress" | "attention" }) {
  const labels = { good: "Good", progress: "In progress", attention: "Needs attention" };
  return <span className={`ent-trace-status ent-trace-status--${status}`}>{labels[status]}</span>;
}

function StageToneDot({ tone }: { tone: "complete" | "progress" | "attention" }) {
  return <span className={`ent-trace-tone-dot ent-trace-tone-dot--${tone}`} aria-hidden />;
}

function SourcingMap({ countries }: { countries: TraceabilityDashboardData["sourcing"]["countries"] }) {
  const points: Record<string, { x: number; y: number }> = {
    PT: { x: 118, y: 148 },
    IT: { x: 148, y: 132 },
    TR: { x: 188, y: 138 },
    IN: { x: 248, y: 168 },
    ES: { x: 108, y: 138 },
    FR: { x: 128, y: 122 },
    DE: { x: 142, y: 108 },
    GB: { x: 118, y: 98 },
    CN: { x: 278, y: 138 },
  };

  const active = countries.slice(0, 6);
  const routePairs: Array<[string, string]> = [];
  for (let i = 0; i < active.length - 1; i += 1) {
    routePairs.push([active[i]!.code, active[i + 1]!.code]);
  }

  return (
    <svg viewBox="0 0 320 220" className="ent-trace-map-svg" aria-label="Sourcing geography map">
      <defs>
        <pattern id="trace-map-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="rgba(196,165,116,0.12)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="320" height="220" fill="url(#trace-map-grid)" rx="12" />
      <path
        d="M60 180 Q120 120 180 150 T300 130"
        fill="rgba(232,220,200,0.35)"
        stroke="rgba(196,165,116,0.2)"
        strokeWidth="1"
      />
      <path
        d="M40 90 Q100 70 160 85 T280 95"
        fill="rgba(228,237,234,0.45)"
        stroke="rgba(62,98,104,0.12)"
        strokeWidth="1"
      />
      {routePairs.map(([a, b]) => {
        const p1 = points[a];
        const p2 = points[b];
        if (!p1 || !p2) return null;
        return (
          <path
            key={`${a}-${b}`}
            d={`M${p1.x} ${p1.y} Q${(p1.x + p2.x) / 2} ${(p1.y + p2.y) / 2 - 18} ${p2.x} ${p2.y}`}
            fill="none"
            stroke="rgba(154,123,79,0.45)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        );
      })}
      {active.map((country) => {
        const pt = points[country.code] || { x: 160, y: 120 };
        return (
          <g key={country.code}>
            <circle cx={pt.x} cy={pt.y} r="14" fill="rgba(196,165,116,0.22)" />
            <circle cx={pt.x} cy={pt.y} r="5" fill="var(--ent-petrol-deep)" />
            <text x={pt.x} y={pt.y + 22} textAnchor="middle" className="ent-trace-map-label">
              {country.code}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function exportCsv(rows: TraceabilityDashboardData["products"]) {
  const header = ["Product", "SKU", "Category", "Completeness", "Country path", "Missing evidence", "Status"];
  const lines = rows.map((row) =>
    [
      row.name,
      row.sku || "",
      row.category,
      `${row.completenessPct}%`,
      row.countryPath.join(" → "),
      row.missingEvidence,
      row.status,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "traceability-products.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function TraceabilityDashboard({ data, slug, period: initialPeriod = "12m" }: Props) {
  const base = `/dashboard/${slug}`;
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<"completeness" | "name">("completeness");

  const productOptions = useMemo(
    () => [{ value: "", label: "All products" }, ...data.products.map((p) => ({ value: p.id, label: p.name }))],
    [data.products]
  );

  const filteredProducts = useMemo(() => {
    let rows = data.products;
    if (productFilter) rows = rows.filter((p) => p.id === productFilter);
    if (categoryFilter) rows = rows.filter((p) => p.category === categoryFilter);
    if (stageFilter) {
      rows = rows.filter((p) => p.missingStages?.includes(stageFilter));
    }
    const q = tableSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku || "").toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) =>
      sortKey === "name" ? a.name.localeCompare(b.name) : a.completenessPct - b.completenessPct
    );
    return rows;
  }, [data.products, data.stages, productFilter, categoryFilter, stageFilter, tableSearch, sortKey]);

  const weakestCategories = useMemo(
    () => [...data.categories].sort((a, b) => a.pct - b.pct).slice(0, 5),
    [data.categories]
  );

  const overallPct = data.summary.avgCompletenessPct;

  return (
    <div className="ent-trace-dashboard ent-fade-in">
      <header className="ent-trace-header">
        <div className="ent-trace-header-copy">
          <h1 className="ent-serif ent-trace-title">Traceability</h1>
          <p className="ent-trace-subtitle ent-page-lead">
            Track material and supply-chain completeness from source to finished product.
          </p>
          <div className="ent-page-meta mt-3">
            <span><strong>{data.summary.productCount}</strong> products</span>
            <span><strong>{data.summary.passportsLinked}</strong> passports linked</span>
            <span><strong>{data.priorityGaps.length}</strong> priority gaps</span>
          </div>
        </div>
        <div className="ent-trace-toolbar">
          <div className="ent-trace-search-wrap">
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setTableSearch(e.target.value);
              }}
              placeholder="Search products, suppliers, countries, or certificates…"
              className="ent-trace-search-input"
              aria-label="Search traceability workspace"
            />
          </div>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className={`${entSelectClass} ent-trace-filter-select`}
            aria-label="Product filter"
          >
            {productOptions.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={initialPeriod}
            onChange={(e) => {
              const params = new URLSearchParams();
              if (e.target.value !== "12m") params.set("period", e.target.value);
              const qs = params.toString();
              router.replace(qs ? `${base}/traceability?${qs}` : `${base}/traceability`);
            }}
            className={`${entSelectClass} ent-trace-filter-select`}
            aria-label="Date range"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="ent-trace-kpi-row">
<article className="ent-trace-kpi-card ent-trace-kpi-card--featured">
          <div className="ent-trace-kpi-donut-wrap">
            <DonutChart pct={overallPct} />
            <span className="ent-trace-kpi-donut-value">{overallPct}%</span>
          </div>
          <p className="ent-trace-kpi-label">Overall completeness</p>
          {data.summary.completenessTrend != null ? (
            <p className="ent-trace-kpi-trend">
              {data.summary.completenessTrend >= 0 ? "+" : ""}
              {data.summary.completenessTrend}% vs. last period
            </p>
          ) : (
            <p className="ent-trace-kpi-hint">Across active products</p>
          )}
        </article>

        <article className="ent-trace-kpi-card">
          <span className="ent-trace-kpi-icon" aria-hidden>
            ◎
          </span>
          <p className="ent-trace-kpi-value">{data.summary.tier1Pct}%</p>
          <p className="ent-trace-kpi-label">Tier 1 known</p>
          <p className="ent-trace-kpi-hint">All products</p>
        </article>

        <article className="ent-trace-kpi-card">
          <span className="ent-trace-kpi-icon" aria-hidden>
            ⟗
          </span>
          <p className="ent-trace-kpi-value">{data.summary.completeChainPct}%</p>
          <p className="ent-trace-kpi-label">Full chain known</p>
          <p className="ent-trace-kpi-hint">Across all products</p>
        </article>

        <article className="ent-trace-kpi-card">
          <span className="ent-trace-kpi-icon" aria-hidden>
            ⬡
          </span>
          <p className="ent-trace-kpi-value">{data.summary.passportsLinked}</p>
          <p className="ent-trace-kpi-label">Passports linked</p>
          <p className="ent-trace-kpi-hint">{data.summary.passportsLinkedPct}% of products</p>
        </article>
      </div>

      <div className="ent-trace-main-grid">
        <section className="ent-trace-panel ent-trace-panel--journey">
          <div className="ent-trace-panel-head">
            <div>
              <h2 className="ent-serif ent-trace-panel-title">Supply Chain Coverage</h2>
              <p className="ent-trace-panel-sub">Where the chain is complete — and where it breaks down.</p>
            </div>
            <Link href={`${base}/products`} className={entLinkClass}>
              View details →
            </Link>
          </div>
          <div className="ent-trace-journey">
            {data.stages.map((stage, index) => (
              <div key={stage.id} className="ent-trace-journey-item">
                {index > 0 ? (
                  <div
                    className={`ent-trace-journey-connector ent-trace-journey-connector--${stage.tone}`}
                    aria-hidden
                  />
                ) : null}
                <Link
                  href={`${base}/products?focus=${stage.id}`}
                  className={`ent-trace-journey-stage ent-trace-journey-stage--${stage.tone}`}
                >
                  <span className="ent-trace-journey-icon" aria-hidden>
                    {STAGE_ICONS[stage.id] || "•"}
                  </span>
                  <span className="ent-trace-journey-label">{stage.label}</span>
                  <span className="ent-trace-journey-pct">{stage.pct}%</span>
                  <span className="ent-trace-journey-status">
                    <StageToneDot tone={stage.tone} />
                    {stage.status}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="ent-trace-panel ent-trace-panel--map">
          <h2 className="ent-serif ent-trace-panel-title">Sourcing Geography</h2>
          <SourcingMap countries={data.sourcing.countries} />
          <ul className="ent-trace-map-stats">
            <li>
              <strong>{data.sourcing.countries.length}</strong> sourcing countries
            </li>
            <li>
              <strong>{data.sourcing.supplierCount}</strong> known suppliers
            </li>
            <li>
              <strong>{data.sourcing.productsMapped}</strong> products mapped
            </li>
          </ul>
          {data.sourcing.countries.length ? (
            <div className="ent-trace-map-chips">
              {data.sourcing.countries.map((country) => (
                <Link
                  key={country.code}
                  href={`${base}/products?origin=${country.code}`}
                  className="ent-trace-map-chip"
                >
                  {countryFlagEmoji(country.code)} {country.label}
                </Link>
              ))}
            </div>
          ) : (
            <p className="ent-trace-map-empty text-sm text-[var(--ent-muted)] mt-3">
              No origin countries recorded yet. Add supply-chain nodes or import catalog data to populate the map.
            </p>
          )}
        </section>
      </div>

      <div className="ent-trace-analytics-grid">
        <section className="ent-trace-panel">
          <h2 className="ent-serif ent-trace-panel-title">Traceability by Category</h2>
          <ul className="ent-trace-bars">
            {data.categories.slice(0, 8).map((row) => (
              <li key={row.category}>
                <Link
                  href={`${base}/products?category=${encodeURIComponent(row.category)}`}
                  className="ent-trace-bar-row"
                >
                  <span className="ent-trace-bar-icon" aria-hidden>
                    {CATEGORY_ICONS[row.category] || "◈"}
                  </span>
                  <span className="ent-trace-bar-label">{row.category}</span>
                  <span className="ent-trace-bar-track">
                    <span
                      className={`ent-trace-bar-fill ent-trace-bar-fill--${stageTone(row.pct)}`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </span>
                  <span className="ent-trace-bar-pct">{row.pct}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="ent-trace-panel">
          <h2 className="ent-serif ent-trace-panel-title">Weakest Categories</h2>
          <p className="ent-trace-panel-sub">Lowest average completeness — focus here first.</p>
          <ol className="ent-trace-rank-list">
            {weakestCategories.map((row, index) => (
              <li key={row.category}>
                <Link
                  href={`${base}/products?category=${encodeURIComponent(row.category)}`}
                  className="ent-trace-rank-item"
                >
                  <span className="ent-trace-rank-num">{index + 1}</span>
                  <span className="ent-trace-rank-label">{row.category}</span>
                  <span className="ent-trace-rank-pct">{row.pct}%</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="ent-trace-panel ent-trace-panel--gaps">
          <div className="ent-trace-panel-head">
            <h2 className="ent-serif ent-trace-panel-title">Priority Gaps</h2>
            <Link href={`${base}/issues`} className={entLinkClass}>
              View all →
            </Link>
          </div>
          <ul className="ent-trace-gaps">
            {data.priorityGaps.length ? (
              data.priorityGaps.map((gap) => (
                <li key={gap.id}>
                  <Link href={gap.href} className="ent-trace-gap-row">
                    <span className="ent-trace-gap-icon" aria-hidden>
                      {gap.issueType === "evidence" ? "📄" : gap.issueType === "supplier" ? "🏭" : "⚠"}
                    </span>
                    <span className="ent-trace-gap-label">{gap.label}</span>
                    <span className="ent-trace-gap-count">
                      {gap.count} product{gap.count === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="ent-trace-gap-empty">No open traceability gaps — strong coverage.</li>
            )}
          </ul>
        </section>
      </div>

      <section className="ent-trace-panel ent-trace-panel--table">
        <div className="ent-trace-table-toolbar">
          <div>
            <h2 className="ent-serif ent-trace-panel-title">Product Traceability</h2>
            <p className="ent-trace-panel-sub">Open a product for tier detail, provenance, and evidence.</p>
          </div>
          <div className="ent-trace-table-actions">
            <input
              type="search"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search products…"
              className="ent-trace-table-search"
              aria-label="Search product table"
            />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as "completeness" | "name")}
              className={`${entSelectClass} ent-trace-filter-select`}
              aria-label="Sort products"
            >
              <option value="completeness">Sort: lowest completeness</option>
              <option value="name">Sort: name</option>
            </select>
            <button type="button" className={entButtonClass} onClick={() => exportCsv(filteredProducts)}>
              Export
            </button>
          </div>
        </div>

        {(categoryFilter || stageFilter) && (
          <div className="ent-trace-active-filters">
            {categoryFilter ? (
              <button type="button" className="ent-trace-filter-pill" onClick={() => setCategoryFilter("")}>
                Category: {categoryFilter} ×
              </button>
            ) : null}
            {stageFilter ? (
              <button type="button" className="ent-trace-filter-pill" onClick={() => setStageFilter("")}>
                Missing: {stageFilter.replaceAll("_", " ")} ×
              </button>
            ) : null}
            {stageFilter ? (
              <Link href={`${base}/products?focus=${stageFilter}`} className={entLinkClass}>
                Open in catalog →
              </Link>
            ) : null}
          </div>
        )}

        <div className="ent-trace-table-wrap">
          <table className="ent-trace-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th scope="col">Chain completeness</th>
                <th scope="col">Country path</th>
                <th scope="col">Missing evidence</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ent-trace-table-empty">
                    No products match your filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={row.href} className="ent-trace-product-cell">
                        <EntProductPlaceholder
                          category={row.category}
                          imageUrl={row.imageUrl}
                          alt={row.name}
                        />
                        <span>
                          <span className="ent-trace-product-name">{row.name}</span>
                          <span className="ent-trace-product-sku">{row.sku || row.styleCode || "—"}</span>
                        </span>
                      </Link>
                    </td>
                    <td>{row.category}</td>
                    <td>
                      <div className="ent-trace-table-progress">
                        <span className="ent-trace-table-progress-label">{row.completenessPct}%</span>
                        <span className="ent-trace-table-progress-track">
                          <span
                            className={`ent-trace-table-progress-fill ent-trace-bar-fill--${stageTone(row.completenessPct)}`}
                            style={{ width: `${row.completenessPct}%` }}
                          />
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="ent-trace-country-path">
                        {row.countryPath.length ? (
                          row.countryPath.map((code, i) => (
                            <span key={`${row.id}-${code}`}>
                              {i > 0 ? <span className="ent-trace-country-arrow">→</span> : null}
                              <Link href={`${base}/products?origin=${code}`} className="ent-trace-country-code">
                                {countryFlagEmoji(code)} {code}
                              </Link>
                            </span>
                          ))
                        ) : (
                          "—"
                        )}
                      </span>
                    </td>
                    <td className="ent-trace-missing">{row.missingEvidence}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function stageTone(pct: number): "complete" | "progress" | "attention" {
  if (pct >= 85) return "complete";
  if (pct >= 50) return "progress";
  return "attention";
}
