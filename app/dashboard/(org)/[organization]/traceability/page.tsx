import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import {
  pilotImageMaps,
  resolvePilotProductImage,
} from "../../../../../lib/enterprise/consumer-signals";
import livePilotProducts from "../../../../../lib/enterprise/fixtures/intertexe-live-10-products.json";
import { loadTraceabilityDashboard } from "../../../../../lib/enterprise/traceability";
import { TraceabilityDashboard } from "./TraceabilityDashboard";

export const dynamic = "force-dynamic";

export default async function TraceabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ organization: string }>;
  searchParams?: Promise<{ period?: string }>;
}) {
  const { organization } = await params;
  const query = (await searchParams) || {};
  const period = query.period || "12m";
  const { membership, client } = await requireOrganizationAccess(organization);
  const data = await loadTraceabilityDashboard(client, membership.organizationId, membership.slug, { period });
  const pilotImages = pilotImageMaps(livePilotProducts);

  const withImages = {
    ...data,
    products: data.products.map((row) => ({
      ...row,
      imageUrl: resolvePilotProductImage(row.sku, row.styleCode, pilotImages),
    })),
  };

  return (
    <TraceabilityDashboard
      data={withImages}
      slug={membership.slug}
      period={period}
    />
  );
}
