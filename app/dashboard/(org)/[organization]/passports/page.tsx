import { Suspense } from "react";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import {
  pilotImageMaps,
  resolvePilotProductImage,
} from "../../../../../lib/enterprise/consumer-signals";
import livePilotProducts from "../../../../../lib/enterprise/fixtures/intertexe-live-10-products.json";
import { loadOrgPassports } from "../../../../../lib/enterprise/queries";
import { EntEmptyState } from "../../../components/EnterpriseUi";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";
import { PassportsCatalog, type PassportCatalogRow } from "./PassportsCatalog";

export const dynamic = "force-dynamic";

export default async function PassportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organization: string }>;
  searchParams?: Promise<{ view?: string }>;
}) {
  const { organization } = await params;
  const query = (await searchParams) || {};
  const { membership, client } = await requireOrganizationAccess(organization);
  const catalog = await loadOrgPassports(client, membership.organizationId);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com").replace(/\/$/, "");
  const base = `/dashboard/${membership.slug}`;
  const pilotImages = pilotImageMaps(livePilotProducts);

  function withImage(row: (typeof catalog.awaitingPublish)[number]): PassportCatalogRow {
    return {
      ...row,
      imageUrl: resolvePilotProductImage(row.productSku, row.productStyleCode, pilotImages),
    };
  }

  const awaitingPublish = catalog.awaitingPublish.map(withImage);
  const published = catalog.published.map(withImage);
  const duplicateNote =
    catalog.rawPassportCount > catalog.identityCount
      ? `${catalog.rawPassportCount - catalog.identityCount} duplicate shell record${catalog.rawPassportCount - catalog.identityCount === 1 ? "" : "s"} merged — same product, variant, and public identity. Multiple SKUs and market identities stay separate.`
      : null;

  return (
    <EntModulePage
      title="Passports"
      meta={
        <>
          <span>
            <strong>{published.length}</strong> published
          </span>
          <span>
            <strong>{awaitingPublish.length}</strong> ready to publish
          </span>
        </>
      }
    >
      {awaitingPublish.length === 0 && published.length === 0 ? (
        <EntEmptyState
          title="No passports yet"
          body="Finish product review — identity, composition, origin, no blocking issues — then approve fields and publish."
          ctaHref={`${base}/products`}
          ctaLabel="Review products"
        />
      ) : (
        <Suspense fallback={<p className="text-sm text-[var(--ent-muted-light)]">Loading passports…</p>}>
        <PassportsCatalog
          slug={membership.slug}
          origin={origin}
          awaitingPublish={awaitingPublish}
          published={published}
          duplicateNote={duplicateNote}
        />
      </Suspense>
      )}
    </EntModulePage>
  );
}
