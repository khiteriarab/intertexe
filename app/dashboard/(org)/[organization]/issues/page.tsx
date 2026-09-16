import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { issueBlocksPublish } from "../../../../../lib/enterprise/issue-copy";
import { pilotImageMaps, resolvePilotProductImage } from "../../../../../lib/enterprise/consumer-signals";
import { loadOrgIssues } from "../../../../../lib/enterprise/queries";
import { loadOrgMemberDirectory } from "../../../../../lib/enterprise/reviewer-display";
import { EntEmptyState } from "../../../components/EnterpriseUi";
import { EntModuleMetrics, EntModulePage } from "../../../components/EnterpriseModuleUi";
import livePilotProducts from "../../../../../lib/enterprise/fixtures/intertexe-live-10-products.json";
import { IssuesInboxClient, type InboxIssue } from "./IssuesInboxClient";

export const dynamic = "force-dynamic";

type IssueSegment = "open" | "review" | "resolved";

export default async function IssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ organization: string }>;
  searchParams?: Promise<{ segment?: string; issueType?: string }>;
}) {
  const { organization } = await params;
  const query = (await searchParams) || {};
  const segment = (query.segment || "open") as IssueSegment;
  const initialIssueType = query.issueType || "";

  const { membership, client } = await requireOrganizationAccess(organization);
  const [issues, directory] = await Promise.all([
    loadOrgIssues(client, membership.organizationId),
    loadOrgMemberDirectory(client, membership.organizationId),
  ]);
  const canMutate = canMutateEnterprise(membership.role);
  const base = `/dashboard/${membership.slug}`;
  const pilotImages = pilotImageMaps(livePilotProducts);
  const members = Array.from(directory.values()).filter((member) => member.id);

  const openCount = issues.filter((issue) => issue.status === "open").length;
  const blockingCount = issues.filter((issue) => issueBlocksPublish(issue)).length;
  const resolvedCount = issues.filter((issue) => issue.status !== "open").length;

  const inboxIssues: InboxIssue[] = issues.map((issue) => ({
    ...issue,
    productImageUrl: resolvePilotProductImage(issue.productSku, issue.productStyleCode, pilotImages),
  }));

  return (
    <EntModulePage
      title="Issues"
      subtitle="Conflicts, missing fields, and validation findings — resolve in place without losing source provenance."
    >
      <EntModuleMetrics
        items={[
          { label: "Open issues", value: openCount, hint: "Needs action" },
          { label: "Blocking publish", value: blockingCount, hint: "Priority fixes", accent: blockingCount > 0 },
          { label: "Resolved", value: resolvedCount, hint: "Closed or waived" },
          { label: "Resolution rate", value: issues.length ? `${Math.round((resolvedCount / issues.length) * 100)}%` : "—", hint: "All time" },
        ]}
      />
      {issues.length === 0 ? (
        <EntEmptyState
          title="Empty inbox"
          body="After import, missing composition, origin, percentage totals, conflicts, and identifier collisions will list here with a recommended action."
          ctaHref={`${base}/products?import=1`}
          ctaLabel="Import products"
        />
      ) : (
        <IssuesInboxClient
          issues={inboxIssues}
          slug={membership.slug}
          base={base}
          canMutate={canMutate}
          members={members}
          initialSegment={segment}
          initialIssueType={initialIssueType}
        />
      )}
    </EntModulePage>
  );
}
