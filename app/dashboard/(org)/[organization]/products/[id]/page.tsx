import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganizationAccess } from "../../../../../../lib/enterprise/access";
import { loadOrgProduct } from "../../../../../../lib/enterprise/queries";
import { loadProductImpactBundle } from "../../../../../../lib/sustainability/product-impact";
import { entLinkClass } from "../../../../components/EnterpriseUi";
import { ProductDetailTabs } from "./ProductDetailTabs";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ organization: string; id: string }>;
}) {
  const { organization, id } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const detail = await loadOrgProduct(client, membership.organizationId, id);
  if (!detail?.product) notFound();

  const impactBundle = await loadProductImpactBundle(
    client,
    membership.organizationId,
    membership.slug,
    detail.product
  );

  const base = `/dashboard/${membership.slug}/products`;

  return (
    <div className="ent-module-stage ent-fade-in">
      <header className="ent-page-header mb-8">
        <Link href={base} className={`${entLinkClass} text-sm mb-3 inline-flex`}>
          ← Products
        </Link>
        <h1 className="ent-title ent-page-title text-[1.625rem] md:text-[2rem] text-[var(--ent-ink)]">
          {detail.product.name}
        </h1>
        <p className="ent-page-lead">
          Identity, materials, traceability, impact, passport, and circularity.
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-[var(--ent-muted)]">Loading product…</p>}>
        <ProductDetailTabs
          product={{
            id: detail.product.id,
            name: detail.product.name,
            sku: detail.product.sku,
            style_code: detail.product.style_code,
            category: detail.product.category,
            passport_state: detail.product.passport_state,
          }}
          base={base}
          slug={membership.slug}
          impactBundle={impactBundle}
        />
      </Suspense>
    </div>
  );
}
