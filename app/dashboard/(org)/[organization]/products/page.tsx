import Link from "next/link";
import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { passportStateLabel } from "../../../../../lib/enterprise/issue-copy";
import { loadOrgProducts } from "../../../../../lib/enterprise/queries";
import { HqPageHeader } from "../../../components/HqUi";
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
      <HqPageHeader
        title="Products"
        description="Your canonical catalog. Upload a file, confirm column mapping, then review collisions before they become confusing product records."
      />
      <p className="text-sm text-black/60 mb-4">
        INTERTEXE needs a mapped CSV (name, SKU or GTIN, composition, origin). After import, open a
        product to see source vs canonical values, then resolve Issues and publish a passport.
      </p>
      <CatalogImportClient slug={membership.slug} canMutate={canMutate} />
      {imported != null && !Number.isNaN(imported) ? (
        <p className="text-sm bg-white border border-black/10 rounded-xl px-4 py-3 mb-4">
          Imported {imported} products. {importedIssues} issues opened
          {importedCollisions
            ? ` · ${importedCollisions} identifier collisions kept separate — review them on Issues`
            : ""}
          . Next: resolve blocking issues, then open a product to review and publish.
        </p>
      ) : null}

      <form className="flex flex-wrap gap-2 mb-4" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, SKU, style"
          className="border border-black/15 rounded-lg px-3 py-2 text-sm bg-white min-w-[12rem]"
        />
        <select
          name="state"
          defaultValue={passportState}
          className="border border-black/15 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All passport states</option>
          {["incomplete", "review_required", "ready", "published", "update_required"].map((state) => (
            <option key={state} value={state}>
              {passportStateLabel(state)}
            </option>
          ))}
        </select>
        <button type="submit" className="text-xs tracking-widest uppercase border border-black/20 px-3 py-2 bg-white">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto bg-white border border-black/10 rounded-xl">
        <table className="min-w-full text-sm">
          <caption className="sr-only">Organization product catalog</caption>
          <thead>
            <tr className="text-left text-[10px] tracking-[0.12em] uppercase text-black/45 border-b border-black/10">
              {[
                "Product",
                "SKU",
                "GTIN",
                "Style",
                "Variant",
                "Material",
                "Issues",
                "Readiness",
                "Updated",
              ].map((col) => (
                <th key={col} className="px-3 py-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-black/50">
                  {q || passportState
                    ? "No products match this filter."
                    : "No products yet. Upload a CSV above, preview the mapping, then confirm import."}
                </td>
              </tr>
            ) : (
              catalog.rows.map((product) => (
                <tr key={product.id} className="border-t border-black/5">
                  <td className="px-3 py-2">
                    <Link className="underline" href={`${base}/${product.id}`}>
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{product.sku || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{product.gtin || "—"}</td>
                  <td className="px-3 py-2">{product.style_code || "—"}</td>
                  <td className="px-3 py-2">{product.variant || "—"}</td>
                  <td className="px-3 py-2 max-w-[14rem] truncate" title={product.composition || ""}>
                    {product.composition || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {product.openIssueCount
                      ? `${product.openIssueCount}${product.blockingIssueCount ? ` (${product.blockingIssueCount} blocking)` : ""}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{passportStateLabel(product.passport_state)}</td>
                  <td className="px-3 py-2">
                    {product.last_updated_at
                      ? new Date(product.last_updated_at).toISOString().slice(0, 10)
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {catalog.total > catalog.pageSize ? (
        <p className="text-xs text-black/50 mt-3">
          Showing {(catalog.page - 1) * catalog.pageSize + 1}–
          {Math.min(catalog.page * catalog.pageSize, catalog.total)} of {catalog.total}
          {catalog.page > 1 ? (
            <>
              {" · "}
              <Link className="underline" href={`${base}?q=${encodeURIComponent(q)}&state=${encodeURIComponent(passportState)}&page=${catalog.page - 1}`}>
                Previous
              </Link>
            </>
          ) : null}
          {catalog.page < totalPages ? (
            <>
              {" · "}
              <Link className="underline" href={`${base}?q=${encodeURIComponent(q)}&state=${encodeURIComponent(passportState)}&page=${catalog.page + 1}`}>
                Next
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <p className="text-xs text-black/45 mt-3">{catalog.total} products in this catalog.</p>
      )}
    </div>
  );
}
