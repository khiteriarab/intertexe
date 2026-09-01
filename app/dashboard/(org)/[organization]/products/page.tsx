import Link from "next/link";
import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { formatCompositionLines } from "../../../../../lib/enterprise/display-format";
import { passportStateLabel } from "../../../../../lib/enterprise/issue-copy";
import { loadOrgProducts } from "../../../../../lib/enterprise/queries";
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
import { CatalogImportClient } from "./CatalogImportClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organization: string }>;
  searchParams?: Promise<{ q?: string; state?: string; page?: string; imported?: string; issues?: string; collisions?: string }>;
}) {
  const { organization } = await params;
  const query = (await searchParams) || {};
  const q = query.q || "";
  const passportState = query.state || "";
  const page = Number(query.page || "1") || 1;
  const imported = query.imported ? Number(query.imported) : null;
  const importedIssues = query.issues ? Number(query.issues) : 0;
  const importedCollisions = query.collisions ? Number(query.collisions) : 0;
  const { membership, client } = await requireOrganizationAccess(organization);
  const catalog = await loadOrgProducts(client, membership.organizationId, {
    q,
    passportState,
    page,
    pageSize: 50,
  });
  const base = `/dashboard/${membership.slug}/products`;
  const canMutate = canMutateEnterprise(membership.role);
  const totalPages = Math.max(1, Math.ceil(catalog.total / catalog.pageSize));

  return (
    <EntModulePage
      zone="cream"
      title="Products"
      description="Your canonical catalog. Upload a file, confirm column mapping, then review before publishing passports."
    >
      <div className="ent-float-card p-5 md:p-6 mb-8">
        <CatalogImportClient slug={membership.slug} canMutate={canMutate} />
      </div>

      {imported != null && !Number.isNaN(imported) ? (
        <div className="ent-zone ent-zone-butter rounded-[var(--ent-radius-2xl)] px-6 py-4 mb-8 text-sm text-[var(--ent-muted)]">
          Imported {imported} products · {importedIssues} issues opened
          {importedCollisions ? ` · ${importedCollisions} identifier collisions kept separate` : ""}. Next: resolve
          blocking issues, then review and publish.
        </div>
      ) : null}

      <form className="ent-float-card flex flex-wrap gap-3 p-5 md:p-6 mb-8" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, SKU, style"
          className={`${entInputClass} min-w-[12rem] flex-1 md:flex-none md:min-w-[16rem]`}
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
              : "Upload a CSV above, preview the mapping, then confirm import."
          }
          ctaHref={q || passportState ? base : undefined}
          ctaLabel={q || passportState ? "Clear filters" : undefined}
        />
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          {catalog.rows.map((product) => {
            const compositionLines = formatCompositionLines(product.composition);
            return (
              <li key={product.id}>
                <Link
                  href={`${base}/${product.id}`}
                  className="group ent-float-card flex flex-col h-full p-5 md:p-6 transition-transform hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <EntProductPlaceholder category={product.category} />
                    <div className="min-w-0 flex-1">
                      <p className="ent-heading text-[17px] text-[var(--ent-ink)] group-hover:text-[var(--ent-petrol-deep)] transition-colors line-clamp-2">
                        {product.name}
                      </p>
                      <p className={entMetaClass + " mt-1"}>
                        {[product.style_code && `Style ${product.style_code}`, product.sku && `SKU ${product.sku}`]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </div>

                  {compositionLines.length > 0 ? (
                    <ul className="text-sm text-[var(--ent-ink-soft)] space-y-0.5 flex-1">
                      {compositionLines.slice(0, 3).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--ent-muted-light)] flex-1">Composition not recorded</p>
                  )}

                  <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-[var(--ent-border)]">
                    <EntPassportPill state={product.passport_state} />
                    {product.openIssueCount ? (
                      <span className="text-xs text-[var(--ent-raspberry)]">{product.openIssueCount} issue{product.openIssueCount === 1 ? "" : "s"}</span>
                    ) : (
                      <span className="text-xs text-[var(--ent-muted-light)]">View →</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {catalog.total > catalog.pageSize ? (
        <p className="text-xs text-[var(--ent-muted-light)] mt-8 ent-float-card px-6 py-4 inline-block">
          Showing {(catalog.page - 1) * catalog.pageSize + 1}–{Math.min(catalog.page * catalog.pageSize, catalog.total)}{" "}
          of {catalog.total}
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
      ) : catalog.rows.length > 0 ? (
        <p className="text-xs text-[var(--ent-muted-light)] mt-8">
          {catalog.total} product{catalog.total === 1 ? "" : "s"} in this catalog
        </p>
      ) : null}
    </EntModulePage>
  );
}
