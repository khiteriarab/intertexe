import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../../lib/dashboard/company-hq";
import { HqSectionFrame } from "../../components/CompanyHqUi";

export const metadata = { title: "Product / Data" };
export const dynamic = "force-dynamic";

export default async function HqProductPage() {
  const session = await requireHqSession();
  const bundle = await fetchCompanyHqBundle(session.workspaceId);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
        <h1 className="font-serif text-2xl sm:text-3xl mt-1">Product / platform health</h1>
        <p className="text-sm text-black/55 mt-2">Catalog, engagement, and data quality signals</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Catalog products" value={String(bundle.product.catalogProducts ?? "—")} />
        <Stat label="Brands (30d active)" value={String(bundle.product.brands ?? "—")} />
        <Stat label="Scans (7d)" value={String(bundle.product.scans7d ?? "—")} />
        <Stat label="Clickouts (7d)" value={String(bundle.product.clickouts7d ?? "—")} />
        <Stat label="DPP ready" value={String(bundle.product.dppReady ?? "—")} />
      </div>

      <HqSectionFrame title="Most searched materials (30d)">
        {bundle.product.topMaterials.length ? (
          <ul className="space-y-2 text-sm">
            {bundle.product.topMaterials.map((row) => (
              <li key={row.material} className="flex justify-between gap-3">
                <span className="text-black/70">{row.material}</span>
                <span className="tabular-nums text-black/45">{row.scans} scans</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-black/45">No material search data yet.</p>
        )}
      </HqSectionFrame>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <p className="text-[10px] tracking-wide uppercase text-black/40">{label}</p>
      <p className="text-2xl font-light tabular-nums mt-1">{value}</p>
    </div>
  );
}
