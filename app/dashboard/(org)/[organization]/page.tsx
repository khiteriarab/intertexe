import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireOrganizationAccess } from "../../../../lib/enterprise/access";
import {
  buildGettingStartedSteps,
  isOnboardingComplete,
  onboardingSkipCookieName,
} from "../../../../lib/enterprise/getting-started";
import { entitlementsForPlan, type PlanKey } from "../../../../lib/enterprise/entitlements";
import { loadPlatformOverview } from "../../../../lib/enterprise/platform-overview";
import { loadOrgOverview } from "../../../../lib/enterprise/queries";
import { PlatformOperatingModel } from "../../components/PlatformOperatingModel";
import { loadOrgCompositionBenchmark } from "../../../../lib/enterprise/composition-benchmark";
import {
  loadConsumerSignals,
  pilotImageMaps,
} from "../../../../lib/enterprise/consumer-signals";
import {
  EntActivityFeed,
  EntAttentionPanel,
  EntOverviewHero,
  type EntAttentionItem,
} from "../../components/EnterpriseUi";
import { EntKpiGrid, EntModuleShowcase, EntOverviewBenchmarkTeaser, EntOverviewCharts } from "../../components/EntDashboardWidgets";
import { EntConsumerSignalsTeaser } from "../../components/EntConsumerSignals";
import { EntGettingStarted } from "../../components/EntGettingStarted";
import livePilotProducts from "../../../../lib/enterprise/fixtures/intertexe-live-10-products.json";
import { isCustomerZeroOrg } from "../../../../lib/enterprise/dual-model";
import { EntCustomerZeroBanner } from "../../components/EntCustomerZeroBanner";
import { EntDualModelFlywheel } from "../../components/EntDualModelFlywheel";
import { EntPilotFindings } from "../../components/EntPilotFindings";
import { UpgradePlanSelector } from "../../components/UpgradePlanSelector";
import { countActiveProducts, loadBillingDashboard } from "../../../../lib/enterprise/billing-gates";
import { isPilotPlan, isPaidSubscriptionPlan } from "../../../../lib/enterprise/pricing";

export const dynamic = "force-dynamic";

type ActivatedPlan = "professional" | "platform";

function parseActivated(value: string | undefined): ActivatedPlan | null {
  if (value === "professional" || value === "platform") return value;
  return null;
}

export default async function OrganizationOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ organization: string }>;
  searchParams?: Promise<{ activated?: string }>;
}) {
  const { organization } = await params;
  const query = (await searchParams) || {};
  const activated = parseActivated(query.activated);
  const { membership, client } = await requireOrganizationAccess(organization);
  const pilotImages = pilotImageMaps(livePilotProducts);
  const [overview, composition, signals, platform, billing, productCount] = await Promise.all([
    loadOrgOverview(client, membership.organizationId),
    loadOrgCompositionBenchmark(client, membership.organizationId, membership.plan),
    loadConsumerSignals(client, membership.organizationId, { limit: 10, pilotImages }),
    loadPlatformOverview(client, membership.organizationId, membership.slug),
    loadBillingDashboard(client, membership.organizationId),
    countActiveProducts(client, membership.organizationId),
  ]);
  const entitlement = entitlementsForPlan(membership.plan as PlanKey, {});
  const pilotWorkspace = isPilotPlan(membership.plan);
  const base = `/dashboard/${membership.slug}`;
  const steps = buildGettingStartedSteps(overview);
  const cookieStore = await cookies();
  const onboardingSkipped =
    cookieStore.get(onboardingSkipCookieName(membership.slug))?.value === "1";
  if (!isOnboardingComplete(steps) && !onboardingSkipped) {
    redirect(`${base}/onboarding`);
  }

  const nextStep =
    overview.productCount === 0
      ? {
          title: "Upload your catalog",
          body: "INTERTEXE needs a CSV of products. You will map columns, preview identifier matches, then confirm import.",
          href: `${base}/products?import=1`,
          label: "Import products",
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
  if (platform.traceability.avgCompletenessPct < 100 && overview.productCount > 0) {
    attentionItems.push({
      label: "traceability gaps",
      count: overview.productCount - Math.round((platform.traceability.completeChainPct / 100) * overview.productCount),
      href: `${base}/traceability`,
      context: `${platform.traceability.avgCompletenessPct}% avg tier coverage`,
    });
  }
  if (platform.supplierRequestsOpen > 0) {
    attentionItems.push({
      label: "supplier requests outstanding",
      count: platform.supplierRequestsOpen,
      href: `${base}/suppliers`,
      context: "Awaiting response or review",
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

      {activated ? (
        <div className="mb-10">
          <UpgradePlanSelector
            slug={membership.slug}
            currentPlan={membership.plan}
            productCount={productCount}
            activated={activated}
            paddleAvailable={billing.paddleCheckoutAvailable}
          />
        </div>
      ) : null}

      {pilotWorkspace && overview.productCount > 0 ? (
        <EntPilotFindings base={base} overview={overview} composition={composition} />
      ) : null}

      {isCustomerZeroOrg(membership.slug) ? <EntCustomerZeroBanner base={base} /> : null}

      <EntKpiGrid overview={overview} base={base} />

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6 mb-10">
        <PlatformOperatingModel model={platform.operatingModel} />
        <div className="ent-float-card p-6 md:p-8">
          <p className="ent-journey-eyebrow">Platform depth</p>
          <dl className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <dt className="text-[var(--ent-muted-light)]">Traceability</dt>
              <dd className="text-xl font-semibold text-[var(--ent-ink)]">{platform.traceability.avgCompletenessPct}%</dd>
            </div>
            <div>
              <dt className="text-[var(--ent-muted-light)]">Impact ready</dt>
              <dd className="text-xl font-semibold text-[var(--ent-ink)]">{platform.impact.ready}</dd>
            </div>
            <div>
              <dt className="text-[var(--ent-muted-light)]">Impact partial</dt>
              <dd className="text-xl font-semibold text-[var(--ent-ink)]">{platform.impact.partial}</dd>
            </div>
            <div>
              <dt className="text-[var(--ent-muted-light)]">Supplier requests</dt>
              <dd className="text-xl font-semibold text-[var(--ent-ink)]">{platform.supplierRequestsOpen}</dd>
            </div>
          </dl>
          {platform.topRisks[0] ? (
            <p className="text-sm text-[var(--ent-muted)] mt-5">
              Priority: {platform.topRisks[0].title} — {platform.topRisks[0].action}
            </p>
          ) : null}
        </div>
      </div>

      <EntOverviewBenchmarkTeaser
        base={base}
        overview={overview}
        stats={composition.stats}
        peerRows={composition.peerRows}
      />

      <EntConsumerSignalsTeaser base={base} signals={signals} />

      {isCustomerZeroOrg(membership.slug) ? <EntDualModelFlywheel base={base} /> : null}

      <EntAttentionPanel
        nextTitle={nextStep.title}
        nextBody={nextStep.body}
        nextHref={nextStep.href}
        nextLabel={nextStep.label}
        items={attentionItems}
      />

      <EntOverviewCharts overview={overview} />

      <EntGettingStarted
        base={base}
        orgSlug={membership.slug}
        steps={steps}
      />

      <EntModuleShowcase overview={overview} base={base} />

      {(pilotWorkspace || membership.plan === "founding_pilot") && !activated ? (
        <div className="ent-zone ent-zone-butter rounded-[var(--ent-radius-2xl)] px-6 py-8 md:px-10 md:py-12 mb-14 shadow-[var(--ent-shadow-panel)]">
          <p className="ent-heading text-[1.65rem] text-[var(--ent-ink)]">
            {pilotWorkspace ? "Ready to continue beyond 10 products?" : "Choose your operating plan"}
          </p>
          <p className="text-sm leading-relaxed text-[var(--ent-muted)] mt-3 max-w-2xl">
            {pilotWorkspace
              ? "You’ve seen INTERTEXE on your catalog. Upgrade inside your workspace to unlock Professional, Platform, or Enterprise — pricing is shared when you’re ready, not on the public site."
              : "Implementation is complete. Subscribe to Professional or Platform to operate your catalog at scale — Enterprise for headless API and custom volume."}
          </p>
          <a href={`${base}/upgrade`} className="inline-flex mt-6 text-sm font-medium text-[var(--ent-petrol-deep)] hover:text-[var(--ent-forest)]">
            View plans & upgrade →
          </a>
        </div>
      ) : null}

      {isPaidSubscriptionPlan(membership.plan) && !activated ? (
        <p className="text-xs text-[var(--ent-muted-light)] mb-10">
          {entitlement.productAllowance ?? "Custom"} product allowance ·{" "}
          {entitlement.passportAllowance ?? "Custom"} hosted passports
          {!entitlement.canUseHeadlessApi ? " · Headless API: Enterprise" : null}
        </p>
      ) : null}

      <EntActivityFeed items={overview.recentActivity} />
    </div>
  );
}
