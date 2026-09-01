import Link from "next/link";
import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { formatCompositionDisplay, formatCompositionLines } from "../../../../../lib/enterprise/display-format";
import { passportStateLabel } from "../../../../../lib/enterprise/issue-copy";
import { loadOrgOverview, loadOrgProducts } from "../../../../../lib/enterprise/queries";
import {
  EntEmptyState,
  EntPassportPill,
  EntProductPlaceholder,
  entButtonGhostClass,
  entInputClass,
  entLinkClass,
  entMetaClass,
  entSelectClass,
} from "../../../components/EnterpriseUi";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";
import { ProductsImportDrawer } from "./ProductsImportDrawer";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organization: string }>;
  searchParams?: Promise<{ q?: string; state?: string; page?: string; imported?: string; issues?: string; collisions?: string; import?: string }>;
}) {
  const { organization } = await params;
  const query = (await searchParams) || {};
  const q = query.q || "";
  const passportState = query.state || "";
  const page = Number(query.page || "1") || 1;
  const imported = query.imported ? Number(query.imported) : null;
  const importedIssues = query.issues ? Number(query.issues) : 0;
  const importedCollisions = query.collisions ? Number(query.collisions) : 0;
  const autoOpenImport = query.import === "1";
  const { membership, client } = await requireOrganizationAccess(organization);
  const [catalog, overview] = await Promise.all([
    loadOrgProducts(client, membership.organizationId, { q, passportState, page, pageSize: 50 }),
    loadOrgOverview(client, membership.organizationId),
  ]);
  const base = `/dashboard/${membership.slug}/products`;
  const canMutate = canMutateEnterprise(membership.role);
  const totalPages = Math.max(1, Math.ceil(catalog.total / catalog.pageSize));

  return (
    <EntModulePage
      title="Products"
      meta={
        <>
          <span>
            <strong>{overview.productCount}</strong> products
          </span>
          <span>
            <strong>{overview.publishedCount || overview.passportCounts.published || 0}</strong> published
          </span>
          <span>
            <strong>{overview.readyCount}</strong> ready
          </span>
        </>
      }
      action={<ProductsImportDrawer slug={membership.slug} canMutate={canMutate} autoOpen={autoOpenImport} />}
    >
      {imported != null && !Number.isNaN(imported) ? (
        <div className="mb-6 px-4 py-3 rounded-[var(--ent-radius-lg)] bg-[var(--ent-butter-soft)] text-sm text-[var(--ent-muted)] border border-[var(--ent-border)]">
          Imported {imported} products · {importedIssues} issues opened
          {importedCollisions ? ` · ${importedCollisions} identifier collisions kept separate` : ""}. Next: resolve
          blocking issues, then review and publish.
        </div>
      ) : null}

      <form className="flex flex-wrap gap-3 mb-8 pb-6 border-b border-[var(--ent-border)]" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products…"
          className={`${entInputClass} min-w-[12rem] flex-1 md:flex-none md:min-w-[18rem]`}
        />
        <select name="state" defaultValue={passportState} className={`${entSelectClass} min-w-[12rem]`}>
          <option value="">All passport states</option>
          {["incomplete", "review_required", "ready", "published", "update_required"].map((state) => (
            <option key={state} value={state}>
              {passportStateLabel(state)}
            </option>
          ))}
        </select>
        <button type="submit" className={entButtonGhostClass}>
          Filter
        </button>
      </form>

      {catalog.rows.length === 0 ? (
        <EntEmptyState
          title={q || passportState ? "No matches" : "No products yet"}
          body={
            q || passportState
              ? "Try a different search or filter."
              : "Import your catalog to begin. INTERTEXE maps columns, previews identifier matches, then saves immutable source records."
          }
          ctaHref={q || passportState ? base : `${base}?import=1`}
          ctaLabel={q || passportState ? "Clear filters" : "Import products"}
        />
      ) : (
        <ul>
          {catalog.rows.map((product) => {
            const compositionLines = formatCompositionLines(product.composition);
            const compositionDisplay = formatCompositionDisplay(product.composition);
            return (
              <li key={product.id}>
                <Link href={`${base}/${product.id}`} className="ent-product-row group">
                  <EntProductPlaceholder category={product.category} />
                  <div className="min-w-0 flex-1">
                    <p className="ent-serif text-[1.35rem] md:text-[1.5rem] text-[var(--ent-ink)] group-hover:text-[var(--ent-petrol-deep)] transition-colors line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-sm text-[var(--ent-ink-soft)] mt-1">
                      {compositionLines.length > 0 ? compositionDisplay : "Composition not recorded"}
                    </p>
                    <p className={entMetaClass + " mt-1.5"}>
                      {[product.sku, product.style_code && `Style ${product.style_code}`].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                    <EntPassportPill state={product.passport_state} />
                    {product.openIssueCount ? (
                      <span className="text-xs text-[var(--ent-raspberry)]">{product.openIssueCount} issue{product.openIssueCount === 1 ? "" : "s"}</span>
                    ) : (
                      <span className="text-xs text-[var(--ent-muted-light)]">Open →</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {catalog.total > catalog.pageSize ? (
        <p className="text-xs text-[var(--ent-muted-light)] mt-8">
          Showing {(catalog.page - 1) * catalog.pageSize + 1}–{Math.min(catalog.page * catalog.pageSize, catalog.total)} of {catalog.total}
          {catalog.page > 1 ? (
            <>
              {" · "}
              <Link className={entLinkClass} href={`${base}?q=${encodeURIComponent(q)}&state=${encodeURIComponent(passportState)}&page=${catalog.page - 1}`}>
                Previous
              </Link>
            </>
          ) : null}
          {catalog.page < totalPages ? (
            <>
              {" · "}
              <Link className={entLinkClass} href={`${base}?q=${encodeURIComponent(q)}&state=${encodeURIComponent(passportState)}&page=${catalog.page + 1}`}>
                Next
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </EntModulePage>
  );
}
