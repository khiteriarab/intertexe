import Link from "next/link";
import { requireOrganizationAccess } from "../../../../lib/enterprise/access";
import { entitlementsForPlan, type PlanKey } from "../../../../lib/enterprise/entitlements";
import { ORG_PAGE_STATES } from "../../../../lib/enterprise/page-states";
import { loadOrgOverview } from "../../../../lib/enterprise/queries";
import { HqCard, HqMetricGrid, HqPageHeader } from "../../components/HqUi";
import { StateBadge } from "./StateBadge";

export const dynamic = "force-dynamic";

const PASSPORT_STATES = [
  "incomplete",
  "review_required",
  "ready",
  "published",
  "update_required",
  "archived",
];

export default async function OrganizationOverviewPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership } = await requireOrganizationAccess(organization);
  const overview = await loadOrgOverview(membership.organizationId);
  const entitlement = entitlementsForPlan(membership.plan as PlanKey, {});
  const base = `/dashboard/${membership.slug}`;

  return (
    <div>
      <HqPageHeader
        title="Overview"
        description="State of this organization's DPP program. Counts come from the Enterprise backend when it is linked — they are never fabricated."
        action={<StateBadge state={ORG_PAGE_STATES.overview} />}
      />

      {!overview.backendLinked ? (
        <p className="mb-6 text-sm text-black/60">
          Enterprise database is not linked in this environment. Metrics stay at zero until
          ENTERPRISE_SUPABASE_URL and ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY are configured.
        </p>
      ) : null}

      <HqMetricGrid
        items={[
          { label: "Total products", value: String(overview.productCount) },
          {
            label: "Required fields complete",
            value: "—",
            hint: "Requires catalog processing",
          },
          {
            label: "Ready for passport",
            value: String(overview.passportCounts.ready || 0),
          },
          {
            label: "Published passports",
            value: String(overview.passportCounts.published || 0),
          },
          {
            label: "Requiring attention",
            value: String(overview.issueCount),
          },
          {
            label: "Regulatory impact",
            value: "—",
            hint: "No customer evaluation until rulesets are active",
          },
        ]}
      />

      {membership.plan === "free_snapshot" ? (
        <div className="mt-6 rounded-xl border border-black/15 bg-white p-5">
          <p className="text-sm font-medium">Continue with the Founding DPP Pilot</p>
          <p className="text-sm text-black/55 mt-1">
            $5,000 · 100 complex products or 500 structured rows. This snapshot organization upgrades
            in place — source records are not copied into a new account.
          </p>
          <p className="text-xs text-black/45 mt-2">
            Product allowance: {entitlement.productAllowance ?? "unlimited"}. Passport publishing is
            not included on the free snapshot.
          </p>
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <HqCard title="Needs your attention">
          {overview.issueCount === 0 && overview.missingCount === 0 ? (
            <p className="text-sm text-black/55">No open issues yet. Import a catalog to generate findings.</p>
          ) : (
            <ul className="text-sm space-y-2">
              <li>
                <Link className="underline" href={`${base}/issues`}>
                  {overview.issueCount} open issues
                </Link>
              </li>
              <li>
                <Link className="underline" href={`${base}/issues`}>
                  {overview.missingCount} missing-data rows
                </Link>
              </li>
            </ul>
          )}
        </HqCard>
        <HqCard title="Passport status">
          <ul className="text-sm space-y-1">
            {PASSPORT_STATES.map((state) => (
              <li key={state} className="flex justify-between">
                <span className="capitalize text-black/70">{state.replaceAll("_", " ")}</span>
                <span className="tabular-nums">{overview.passportCounts[state] || 0}</span>
              </li>
            ))}
          </ul>
        </HqCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <HqCard title="Recent activity">
          {overview.recentActivity.length === 0 ? (
            <p className="text-sm text-black/55">No operational activity recorded yet.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {overview.recentActivity.map((item) => (
                <li key={item.id}>{item.title}</li>
              ))}
            </ul>
          )}
        </HqCard>
        <HqCard title="Regulatory monitor">
          <p className="text-sm text-black/55">
            Only actionable catalog impact will appear here. This is not a legal-news feed, and INTERTEXE
            does not certify official compliance.
          </p>
        </HqCard>
      </div>
    </div>
  );
}
