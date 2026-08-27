import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { OrgSectionFrame } from "../section-frame";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";

export const dynamic = "force-dynamic";

export default async function FilesPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  await requireOrganizationAccess((await params).organization);
  return (
    <OrgSectionFrame
      title="Files"
      description="Private organization folders for imports, evidence, supplier uploads, exports, and documents. Confidential buckets are not public. Passport artwork that must be public lives in a separate bucket."
      state={ORG_PAGE_STATES.files}
      emptyTitle="No files"
      emptyBody="Uploads are stored as {organization_id}/... and are authorized by membership. Browser MIME type is not trusted as the only check."
    />
  );
}
