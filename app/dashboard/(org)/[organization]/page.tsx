import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireOrganizationAccess } from "../../../../lib/enterprise/access";
import {
  buildGettingStartedSteps,
  isOnboardingComplete,
  onboardingSkipCookieName,
} from "../../../../lib/enterprise/getting-started";
import { entitlementsForPlan, type PlanKey } from "../../../../lib/enterprise/entitlements";
import { loadOrgOverview } from "../../../../lib/enterprise/queries";
import { loadOrganizationMeasurementPreferences } from "../../../../lib/enterprise/org-preferences";
import { loadOrgCompositionBenchmark } from "../../../../lib/enterprise/composition-benchmark";
import { loadPlatformIntelligenceForOrg } from "../../../../lib/enterprise/platform-intelligence";
import {
  loadConsumerSignals,
  pilotImageMaps,
} from "../../../../lib/enterprise/consumer-signals";
import { EntOverviewHero } from "../../components/EnterpriseUi";
import { EntKpiGrid, EntOverviewCharts } from "../../components/EntDashboardWidgets";
import { EntIntelligenceWorkspace } from "../../components/EntIntelligenceWorkspace";
import { EntConsumerSignalsTeaser } from "../../components/EntConsumerSignals";
import livePilotProducts from "../../../../lib/enterprise/fixtures/intertexe-live-10-products.json";
import { isCustomerZeroOrg } from "../../../../lib/enterprise/dual-model";
import { EntCustomerZeroBanner } from "../../components/EntCustomerZeroBanner";
import { EntDualModelFlywheel } from "../../components/EntDualModelFlywheel";
import { EntPilotFindings } from "../../components/EntPilotFindings";
import { UpgradePlanSelector } from "../../components/UpgradePlanSelector";
import { EntPostPaymentSync } from "../../components/EntPostPaymentSync";
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
  const [overview, composition, intelligence, signals, billing, productCount, measurementPreferences] = await Promise.all([
    loadOrgOverview(client, membership.organizationId),
    loadOrgCompositionBenchmark(client, membership.organizationId, membership.plan),
    loadPlatformIntelligenceForOrg(client, membership.organizationId, membership.slug, membership.plan),
    loadConsumerSignals(client, membership.organizationId, { limit: 10, pilotImages }),
    loadBillingDashboard(client, membership.organizationId),
    countActiveProducts(client, membership.organizationId),
    loadOrganizationMeasurementPreferences(client, membership.organizationId),
  ]);
  const entitlement = entitlementsForPlan(membership.plan as PlanKey, {});
  const pilotWorkspace = isPilotPlan(membership.plan);
  const base = `/dashboard/${membership.slug}`;
  const steps = buildGettingStartedSteps({
    ...overview,
    measurementConfigured: measurementPreferences.configured,
  });
  const cookieStore = await cookies();
  const onboardingSkipped =
    cookieStore.get(onboardingSkipCookieName(membership.slug))?.value === "1";
  if (!isOnboardingComplete(steps) && !onboardingSkipped) {
    redirect(`${base}/onboarding`);
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
          <EntPostPaymentSync slug={membership.slug} activated={activated} initialPlan={membership.plan} />
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

      <section className="ent-ops-teaser mb-10 md:mb-12">
        <div className="ent-ops-teaser-card">
          <div>
            <p className="ent-section-eyebrow">Operations</p>
            <h2 className="ent-serif text-[1.75rem] md:text-[2rem] text-[var(--ent-ink)]">From data to action</h2>
            <p className="text-sm text-[var(--ent-muted)] mt-3 max-w-xl leading-relaxed">
              Imports, approvals, supplier evidence, and passport publishing — in one operational command center.
            </p>
          </div>
          <Link href={`${base}/operations`} className="ent-btn ent-btn-primary text-sm shrink-0">
            Open operations →
          </Link>
        </div>
      </section>

      <EntIntelligenceWorkspace data={intelligence} base={base} variant="home" />

      <EntConsumerSignalsTeaser base={base} signals={signals} />

      {isCustomerZeroOrg(membership.slug) ? <EntDualModelFlywheel base={base} /> : null}


      <EntOverviewCharts overview={overview} />



      {(pilotWorkspace || membership.plan === "founding_pilot") && !activated ? (
        <div className="ent-card ent-card-primary mb-14">
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

    </div>
  );
}
