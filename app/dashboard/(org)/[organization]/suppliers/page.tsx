import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import {
  pilotImageMaps,
  resolvePilotProductImage,
} from "../../../../../lib/enterprise/consumer-signals";
import livePilotProducts from "../../../../../lib/enterprise/fixtures/intertexe-live-10-products.json";
import { loadOrgSupplierCollaboration, loadOrgSupplierPerformance, loadOrgSuppliers } from "../../../../../lib/enterprise/module-queries";
import { EntOpsPageHeader } from "../../../components/EntOpsModuleUi";
import { SuppliersWorkspace } from "./SuppliersWorkspace";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const [data, collaboration, performance] = await Promise.all([
    loadOrgSuppliers(client, membership.organizationId),
    loadOrgSupplierCollaboration(client, membership.organizationId),
    loadOrgSupplierPerformance(client, membership.organizationId),
  ]);

  const productIds = Array.from(
    new Set([
      ...data.suppliers.flatMap((s) => s.productIds),
      ...collaboration.requests.map((r) => r.productId).filter(Boolean),
    ])
  ) as string[];

  const { data: products } = productIds.length
    ? await client
        .from("products")
        .select("id, name, sku, category, passport_state, style_code")
        .eq("organization_id", membership.organizationId)
        .in("id", productIds)
    : { data: [] };

  const pilotImages = pilotImageMaps(livePilotProducts);
  const productsById = Object.fromEntries(
    (products || []).map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        sku: row.sku,
        category: row.category,
        passportState: row.passport_state,
        imageUrl: resolvePilotProductImage(row.sku, row.style_code, pilotImages),
      },
    ])
  );

  const requests = collaboration.requests;

  return (
    <div className="ent-opsmod-page">
      <EntOpsPageHeader
        title="Suppliers"
        subtitle="Evidence requests, linked suppliers, and collaboration."
      />
      <SuppliersWorkspace
        slug={membership.slug}
        suppliers={data.suppliers}
        summary={data.summary}
        requests={requests}
        productsById={productsById}
        avgResponseDays={performance.avgResponseDays}
      />
    </div>
  );
}
