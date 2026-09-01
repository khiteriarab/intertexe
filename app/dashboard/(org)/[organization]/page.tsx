import { requireOrganizationAccess } from "../../../../lib/enterprise/access";
import { entitlementsForPlan, type PlanKey } from "../../../../lib/enterprise/entitlements";
import { loadOrgOverview } from "../../../../lib/enterprise/queries";
import {
  EntActivityFeed,
  EntAttentionPanel,
  EntOverviewHero,
  type EntAttentionItem,
} from "../../components/EnterpriseUi";

export const dynamic = "force-dynamic";

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
            body: "Blocking findings must be understood before publish.",
            href: `${base}/issues`,
            label: "Review issues",
          }
        : overview.readyCount > 0
          ? {
              title: "Publish ready passports",
              body: "Eligible products have identity, composition, origin, no blocking issues, and approved fields.",
              href: `${base}/passports`,
              label: "Review passports",
            }
          : overview.updateRequiredCount > 0
            ? {
                title: "Publish updated versions",
                body: "Source changes marked passports update-required. The last published snapshot stays live until you publish again.",
                href: `${base}/passports`,
                label: "Review passports",
              }
            : {
                title: "Review products",
                body: "Open a product to compare source vs canonical data, approve fields, then publish.",
                href: `${base}/products`,
                label: "Review products",
              };

  const attentionItems: EntAttentionItem[] = [];
  if (overview.productStateCounts.review_required) {
    attentionItems.push({
      label: "products need review",
      count: overview.productStateCounts.review_required,
      href: `${base}/products?state=review_required`,
      context: "Fields awaiting approval",
    });
  }
  if (overview.readyCount > 0) {
    attentionItems.push({
      label: "passports ready to publish",
      count: overview.readyCount,
      href: `${base}/passports`,
      emphasis: true,
      context: "All requirements met",
    });
  }
  if (overview.issueCount > 0) {
    attentionItems.push({
      label: "open issues",
      count: overview.issueCount,
      href: `${base}/issues`,
      context: "Review before publishing",
    });
  }
  if (overview.missingCount > 0) {
    attentionItems.push({
      label: "missing data fields",
      count: overview.missingCount,
      href: `${base}/issues`,
      context: "Composition, origin, or identifiers",
    });
  }

  return (
    <div>
      {!overview.backendLinked ? (
        <p className="mb-8 text-sm text-[var(--ent-muted)]">
          Enterprise database is not linked in this environment. Metrics stay at zero until
          ENTERPRISE_SUPABASE_URL is configured.
        </p>
      ) : null}

      <EntOverviewHero overview={overview} orgName={membership.name} />

      <EntAttentionPanel
        nextTitle={nextStep.title}
        nextBody={nextStep.body}
        nextHref={nextStep.href}
        nextLabel={nextStep.label}
        items={attentionItems}
      />

      {membership.plan === "free_snapshot" ? (
        <div className="ent-zone ent-zone-butter rounded-[var(--ent-radius-2xl)] px-8 py-10 md:px-10 md:py-12 mb-14 shadow-[var(--ent-shadow-panel)]">
          <p className="ent-heading text-[1.65rem] text-[var(--ent-ink)]">Continue with the Founding DPP Pilot</p>
          <p className="text-sm leading-relaxed text-[var(--ent-muted)] mt-3 max-w-2xl">
            $5,000 · 100 complex products or 500 structured rows. This snapshot organization upgrades in place — source
            records are not copied into a new account.
          </p>
          <p className="text-xs text-[var(--ent-muted-light)] mt-4">
            Product allowance: {entitlement.productAllowance ?? "unlimited"}. Passport publishing is not included on the
            free snapshot.
          </p>
        </div>
      ) : null}

      <EntActivityFeed items={overview.recentActivity} />
    </div>
  );
}
