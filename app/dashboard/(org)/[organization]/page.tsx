import Link from "next/link";
import { requireOrganizationAccess } from "../../../../lib/enterprise/access";
import { entitlementsForPlan, type PlanKey } from "../../../../lib/enterprise/entitlements";
import { passportStateLabel } from "../../../../lib/enterprise/issue-copy";
import { loadOrgOverview } from "../../../../lib/enterprise/queries";
import { HqCard, HqMetricGrid, HqPageHeader } from "../../components/HqUi";

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
  const { membership, client } = await requireOrganizationAccess(organization);
  const overview = await loadOrgOverview(client, membership.organizationId);
  const entitlement = entitlementsForPlan(membership.plan as PlanKey, {});
  const base = `/dashboard/${membership.slug}`;

  const nextStep =
    overview.productCount === 0
      ? {
          title: "Upload your catalog",
          body: "INTERTEXE needs a CSV of products. You will map columns, preview identifier matches, then confirm import.",
          href: `${base}/products`,
          label: "Go to Products",
        }
      : overview.issueCount > 0
        ? {
            title: "Resolve open issues",
            body: "Blocking findings (missing composition/origin, invalid percentages, identifier collisions) must be understood before publish.",
            href: `${base}/issues`,
            label: "Go to Issues",
          }
        : overview.readyCount > 0
          ? {
              title: "Publish ready passports",
              body: "Eligible products have identity, composition, origin, no blocking issues, and approved fields.",
              href: `${base}/passports`,
              label: "Go to Passports",
            }
          : overview.updateRequiredCount > 0
            ? {
                title: "Publish updated versions",
                body: "A later source change marked passports update-required. The last published snapshot stays live until you publish again.",
                href: `${base}/passports`,
                label: "Go to Passports",
              }
            : {
                title: "Review products",
                body: "Open a product to compare source vs canonical data, approve fields, then publish.",
                href: `${base}/products`,
                label: "Go to Products",
              };

  return (
    <div>
      <HqPageHeader
        title="Overview"
        description="Where this catalog stands, what INTERTEXE needs from you, and what is blocking a passport."
      />

      {!overview.backendLinked ? (
        <p className="mb-6 text-sm text-black/60">
          Enterprise database is not linked in this environment. Metrics stay at zero until
          ENTERPRISE_SUPABASE_URL is configured.
        </p>
      ) : null}

      <HqMetricGrid
        items={[
          { label: "Total products", value: String(overview.productCount) },
          {
            label: "Ready for passport",
            value: String(overview.readyCount),
          },
          {
            label: "Published passports",
            value: String(overview.publishedCount || overview.passportCounts.published || 0),
          },
          {
            label: "Open issues",
            value: String(overview.issueCount),
          },
        ]}
      />

      <div className="mt-6 rounded-xl border border-black/15 bg-white p-5">
        <p className="text-[10px] uppercase tracking-wide text-black/45">What happens next</p>
        <p className="text-sm font-medium mt-1">{nextStep.title}</p>
        <p className="text-sm text-black/55 mt-1">{nextStep.body}</p>
        <Link className="inline-block mt-3 text-xs tracking-widest uppercase underline" href={nextStep.href}>
          {nextStep.label}
        </Link>
      </div>

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
            <p className="text-sm text-black/55">
              No open issues. Import a catalog if this workspace is empty, or publish ready products.
            </p>
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
                <span className="text-black/70">{passportStateLabel(state)}</span>
                <span className="tabular-nums">{overview.productStateCounts[state] || 0}</span>
              </li>
            ))}
          </ul>
        </HqCard>
      </div>

      <div className="mt-4">
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
      </div>
    </div>
  );
}
