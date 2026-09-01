import Link from "next/link";
import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import {
  formatCompositionLines,
} from "../../../../../lib/enterprise/display-format";
import { passportStateLabel } from "../../../../../lib/enterprise/issue-copy";
import { loadOrgProducts } from "../../../../../lib/enterprise/queries";
import {
  EntEmptyState,
  EntPageHeader,
  EntPassportPill,
  EntProductPlaceholder,
  entButtonGhostClass,
  entInputClass,
  entLinkClass,
  entMetaClass,
} from "../../../components/EnterpriseUi";
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
    <div>
      <EntPageHeader
        brandLine
        title="Products"
        description="Your canonical catalog. Upload a file, confirm column mapping, then review before publishing passports."
      />
      <CatalogImportClient slug={membership.slug} canMutate={canMutate} />

      {imported != null && !Number.isNaN(imported) ? (
        <p className="text-sm text-[var(--ent-muted)] mb-8 py-4 border-y border-[var(--ent-border)]">
          Imported {imported} products · {importedIssues} issues opened
          {importedCollisions ? ` · ${importedCollisions} identifier collisions kept separate` : ""}. Next: resolve
          blocking issues, then review and publish.
        </p>
      ) : null}

      <form className="flex flex-wrap gap-3 mb-10" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, SKU, style"
          className={`${entInputClass} min-w-[12rem] flex-1 md:flex-none md:min-w-[16rem]`}
        />
        <select name="state" defaultValue={passportState} className={entInputClass}>
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
        <ul className="divide-y divide-[var(--ent-border)]">
          {catalog.rows.map((product) => {
            const compositionLines = formatCompositionLines(product.composition);
            return (
              <li key={product.id}>
                <Link
                  href={`${base}/${product.id}`}
                  className="group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 py-5 md:py-6 transition-colors hover:bg-[var(--ent-surface-muted)]/25 -mx-2 px-2 rounded-[var(--ent-radius-lg)]"
                >
                  <EntProductPlaceholder category={product.category} />

                  <div className="flex-1 min-w-0 grid sm:grid-cols-[1fr_auto] gap-3 sm:gap-6 items-start sm:items-center">
                    <div className="min-w-0 space-y-2">
                      <p className="text-[17px] font-medium text-[var(--ent-ink)] group-hover:text-[var(--ent-petrol-deep)] transition-colors">
                        {product.name}
                      </p>
                      {compositionLines.length > 0 ? (
                        <ul className="text-[15px] text-[var(--ent-ink-soft)] space-y-0.5">
                          {compositionLines.slice(0, 4).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[var(--ent-muted-light)]">Composition not recorded</p>
                      )}
                      <p className={entMetaClass}>
                        {[product.style_code && `Style ${product.style_code}`, product.sku && `SKU ${product.sku}`]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                        {product.openIssueCount ? ` · ${product.openIssueCount} open issue${product.openIssueCount === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                      <EntPassportPill state={product.passport_state} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {catalog.total > catalog.pageSize ? (
        <p className="text-xs text-[var(--ent-muted-light)] mt-8 pt-6 border-t border-[var(--ent-border)]">
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
        <p className="text-xs text-[var(--ent-muted-light)] mt-8 pt-6 border-t border-[var(--ent-border)]">
          {catalog.total} product{catalog.total === 1 ? "" : "s"} in this catalog
        </p>
      ) : null}
    </div>
  );
}
