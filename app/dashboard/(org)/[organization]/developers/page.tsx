import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { LaterModulePage } from "../later-module";

export const dynamic = "force-dynamic";

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  await requireOrganizationAccess((await params).organization);
  return <LaterModulePage title="Developers" />;
}
