import Link from "next/link";
import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgProducts } from "../../../../../lib/enterprise/queries";
import { HqPageHeader } from "../../../components/HqUi";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";
import { StateBadge } from "../StateBadge";
import { CatalogImportClient } from "./CatalogImportClient";

export const dynamic = "force-dynamic";

const FILTERS = [
  "category",
  "material",
  "collection",
  "season",
  "supplier",
  "DPP state",
  "issue type",
  "missing fields",
  "review status",
];

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership } = await requireOrganizationAccess(organization);
  const products = await loadOrgProducts(membership.organizationId);
  const base = `/dashboard/${membership.slug}/products`;
  const canMutate = canMutateEnterprise(membership.role);

  return (
    <div>
      <HqPageHeader
        title="Products"
        description="Canonical catalog. Internal IDs, SKUs, GTINs, style codes, variant IDs, and passport IDs remain distinct."
        action={<StateBadge state={ORG_PAGE_STATES.products} />}
      />
      <CatalogImportClient slug={membership.slug} canMutate={canMutate} />
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((filter) => (
          <span
            key={filter}
            className="text-[11px] tracking-wide uppercase border border-black/10 bg-white px-2 py-1 text-black/45"
          >
            {filter}
          </span>
        ))}
      </div>
      <p className="text-xs text-black/45 mb-4">
        Bulk actions (assign reviewer, request supplier data, export, approve, create passports) require
        a linked catalog and are not enabled on empty datasets.
      </p>
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
                "Category",
                "Primary material",
                "Completeness",
                "Open issues",
                "Passport",
                "Updated",
              ].map((col) => (
                <th key={col} className="px-3 py-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-black/50">
                  No products in this organization yet. Upload is limited by plan entitlement.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-t border-black/5">
                  <td className="px-3 py-2">
                    <Link className="underline" href={`${base}/${product.id}`}>
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{product.sku || "—"}</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">{product.style_code || "—"}</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">{product.category || "—"}</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">
                    {product.data_completeness != null ? String(product.data_completeness) : "—"}
                  </td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">{product.passport_state || "—"}</td>
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
    </div>
  );
}
