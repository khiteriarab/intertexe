import { Suspense } from "react";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadImportDetail, loadImportHistory } from "../../../../../lib/enterprise/import-ops";
import { EntOpsPageHeader } from "../../../components/EntOpsModuleUi";
import { ImportsPageHeader, ImportsWorkspace } from "./ImportsWorkspace";

export const dynamic = "force-dynamic";

export default async function ImportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organization: string }>;
  searchParams?: Promise<{ import?: string }>;
}) {
  const { organization } = await params;
  const query = (await searchParams) || {};
  const { membership, client } = await requireOrganizationAccess(organization);
  const items = await loadImportHistory(client, membership.organizationId);
  const selectedId = query.import || items[0]?.id || null;
  const detail = selectedId ? await loadImportDetail(client, membership.organizationId, selectedId) : null;

  return (
    <div className="ent-opsmod-page">
      <EntOpsPageHeader
        title="Import center"
        subtitle="Upload history, row counts, and errors."
        action={<ImportsPageHeader slug={membership.slug} />}
      />
      <Suspense fallback={<p className="text-sm text-[var(--ent-muted)]">Loading imports…</p>}>
        <ImportsWorkspace slug={membership.slug} items={items} detail={detail} selectedId={selectedId} />
      </Suspense>
    </div>
  );
}
