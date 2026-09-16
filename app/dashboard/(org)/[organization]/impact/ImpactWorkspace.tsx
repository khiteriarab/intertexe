"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ImpactTabData } from "../../../../../lib/sustainability/queries";
import { providerAttribution } from "../../../../../lib/sustainability/providers";
import { entLinkClass } from "../../../components/EnterpriseUi";
import { ImpactOverviewPanel } from "./ImpactOverviewPanel";
import { ImpactTablePanel } from "./ImpactTablePanel";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "products", label: "Product Impact" },
  { id: "materials", label: "Materials" },
  { id: "facilities", label: "Facilities" },
  { id: "scores", label: "Scores" },
  { id: "evidence", label: "Evidence" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ImpactWorkspace({ data, base }: { data: ImpactTabData; base: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabId) || "overview";
  const activeTab = TABS.some((t) => t.id === tab) ? tab : "overview";

  function setTab(next: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${base}/impact?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="ent-impact-workspace">
      <div className="ent-segmented mb-8 overflow-x-auto">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`ent-segmented-link whitespace-nowrap ${activeTab === item.id ? "ent-segmented-link-active" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? <ImpactOverviewPanel overview={data.overview} base={base} /> : null}
      {activeTab === "products" ? (
        <ImpactTablePanel
          emptyMessage="No product impact data yet. Connect Worldly or Green Story to ingest footprints."
          headers={["Product", "Carbon", "Primary score", "Measured", "Source", "Action"]}
          rows={data.products.map((row) => ({
            key: row.productId,
            cells: [
              <Link key="name" href={`${base}/products/${row.productId}?tab=impact`} className={entLinkClass}>
                {row.name}
              </Link>,
              row.carbon ? `${row.carbon.value} ${row.carbon.unit}` : "—",
              row.primaryScore ? `${row.primaryScore.value} ${row.primaryScore.unit}` : "—",
              row.measuredShare != null ? `${row.measuredShare}%` : "—",
              row.provider ? providerAttribution(row.provider) : "—",
              <Link key="action" href={`${base}/products/${row.productId}?tab=impact`} className={entLinkClass}>
                Open →
              </Link>,
            ],
          }))}
        />
      ) : null}
      {activeTab === "materials" ? (
        <ImpactTablePanel
          emptyMessage="Material-level impact aggregates appear when provider data is connected."
          headers={["Material", "Products", "Avg carbon", "Measured share", "Provider"]}
          rows={data.materials.map((row) => ({
            key: row.material,
            cells: [
              row.material,
              String(row.productCount),
              row.avgCarbon ? `${row.avgCarbon.value} ${row.avgCarbon.unit}` : "—",
              `${row.measuredShare}%`,
              providerAttribution(row.provider),
            ],
          }))}
        />
      ) : null}
      {activeTab === "facilities" ? (
        <ImpactTablePanel
          emptyMessage="Facility environmental data requires Worldly / Higg authorization."
          headers={["Facility", "Country", "Carbon", "Water / energy", "Provider", "Last sync"]}
          rows={data.facilities.map((row) => ({
            key: row.id,
            cells: [
              row.name,
              row.countryCode || "—",
              row.carbon ? `${row.carbon.value} ${row.carbon.unit}` : "—",
              [row.water && `${row.water.value} ${row.water.unit}`, row.energy && `${row.energy.value} ${row.energy.unit}`]
                .filter(Boolean)
                .join(" · ") || "—",
              providerAttribution(row.provider),
              row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleDateString() : "—",
            ],
          }))}
        />
      ) : null}
      {activeTab === "scores" ? (
        <ImpactTablePanel
          emptyMessage="No sustainability scores ingested yet."
          note="Each score uses its own methodology. INTERTEXE Traceability Score is separate from environmental scores."
          headers={["Product", "Score type", "Value", "Provider", "Market", "Status"]}
          rows={data.scores.map((score, index) => ({
            key: `${score.productId}-${score.type}-${index}`,
            cells: [
              score.productName,
              score.label || score.type.replaceAll("_", " "),
              `${score.value} ${score.unit}`,
              score.provider === "intertexe" ? "INTERTEXE" : providerAttribution(score.provider),
              score.market || "—",
              score.status,
            ],
          }))}
        />
      ) : null}
      {activeTab === "evidence" ? (
        <ImpactTablePanel
          emptyMessage="Evidence coverage appears when impact assessments are linked to product records."
          headers={["Product", "Verified", "Required", "Source", "Last calculated"]}
          rows={data.evidenceRows.map((row) => ({
            key: row.productId,
            cells: [
              row.productName,
              String(row.verified),
              String(row.required),
              row.provider,
              row.lastCalculatedAt ? new Date(row.lastCalculatedAt).toLocaleDateString() : "—",
            ],
          }))}
        />
      ) : null}
    </div>
  );
}
