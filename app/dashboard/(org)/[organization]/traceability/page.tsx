import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadCatalogTraceabilitySummary, loadProductTraceability } from "../../../../../lib/enterprise/traceability";
import { EntModuleMetrics, EntModulePage, EntModuleSection, entLinkClass } from "../../../components/EnterpriseModuleUi";

export const dynamic = "force-dynamic";

export default async function TraceabilityPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const summary = await loadCatalogTraceabilitySummary(client, membership.organizationId);
  const base = `/dashboard/${membership.slug}`;

  const { data: products } = await client
    .from("products")
    .select("id, name, sku, category, passport_state")
    .eq("organization_id", membership.organizationId)
    .eq("lifecycle", "active")
    .order("last_updated_at", { ascending: false })
    .limit(20);

  const productTrace = await Promise.all(
    (products || []).slice(0, 12).map(async (product) => ({
      product,
      trace: await loadProductTraceability(client, membership.organizationId, product.id),
    }))
  );

  return (
    <EntModulePage
      title="Traceability"
      subtitle="Tier coverage across your catalog — no fabricated completeness."
    >
      <EntModuleMetrics
        items={[
          { label: "Products", value: summary.productCount },
          { label: "Tier 1 known", value: `${summary.tier1Pct}%` },
          { label: "Tier 2 known", value: `${summary.tier2Pct}%` },
          { label: "Tier 3+", value: `${summary.tier3PlusPct}%` },
          { label: "Avg completeness", value: `${summary.avgCompletenessPct}%`, accent: summary.avgCompletenessPct < 50 },
          { label: "Complete chain", value: `${summary.completeChainPct}%` },
        ]}
      />

      {summary.weakestCategories.length ? (
        <EntModuleSection title="Weakest categories" subtitle="Lowest average traceability completeness">
          <ul className="space-y-2">
            {summary.weakestCategories.map((row) => (
              <li key={row.category} className="ent-panel-nested px-4 py-3 flex justify-between gap-4 text-sm">
                <span className="text-[var(--ent-ink)]">{row.category}</span>
                <span className="text-[var(--ent-muted)]">
                  {row.avgCompleteness}% · {row.productCount} products
                </span>
              </li>
            ))}
          </ul>
        </EntModuleSection>
      ) : null}

      <EntModuleSection title="Product traceability" subtitle="Open a product for tier detail and provenance">
        {productTrace.length === 0 ? (
          <p className="text-sm text-[var(--ent-muted)]">No active products. Import a catalog to begin.</p>
        ) : (
          <ul className="space-y-2">
            {productTrace.map(({ product, trace }) => (
              <li key={product.id} className="ent-panel-nested px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`${base}/products/${product.id}?tab=traceability`} className="font-medium text-[var(--ent-ink)] hover:text-[var(--ent-petrol-deep)]">
                      {product.name}
                    </Link>
                    <p className="text-xs text-[var(--ent-muted)] mt-1">
                      {product.sku || "—"} · {trace.knownTierCount}/4 tiers · {trace.completenessPct}% complete
                    </p>
                    {trace.missingTierLabels.length ? (
                      <p className="text-xs text-[var(--ent-raspberry)] mt-1">
                        Missing: {trace.missingTierLabels.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <Link href={`${base}/products/${product.id}?tab=traceability`} className={entLinkClass}>
                    View →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </EntModuleSection>
    </EntModulePage>
  );
}
