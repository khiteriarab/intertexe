import type { Metadata } from "next";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { countActiveProducts, loadBillingDashboard } from "../../../../../lib/enterprise/billing-gates";
import { isPaidSubscriptionPlan, isPilotPlan } from "../../../../../lib/enterprise/pricing";
import { UpgradePlanSelector } from "../../../components/UpgradePlanSelector";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Upgrade · INTERTEXE",
  robots: { index: false, follow: false },
};

export default async function UpgradePage({
  params,
  searchParams,
}: {
  params: Promise<{ organization: string }>;
  searchParams?: Promise<{ cancel?: string }>;
}) {
  const { organization } = await params;
  const query = (await searchParams) || {};
  const { membership, client } = await requireOrganizationAccess(organization);
  const [billing, productCount] = await Promise.all([
    loadBillingDashboard(client, membership.organizationId),
    countActiveProducts(client, membership.organizationId),
  ]);

  const plan = membership.plan;
  const showUpgrade = isPilotPlan(plan) || plan === "founding_pilot" || isPaidSubscriptionPlan(plan);

  return (
    <EntModulePage
      title="Billing"
      subtitle={
        showUpgrade
          ? "Choose a plan to continue beyond your pilot workspace."
          : "Your workspace plan is managed by INTERTEXE."
      }
    >
      {query.cancel ? (
        <p className="text-sm text-[var(--ent-muted)] mb-6">Checkout canceled — no changes were made.</p>
      ) : null}

      {showUpgrade ? (
        <UpgradePlanSelector
          slug={membership.slug}
          currentPlan={plan}
          productCount={productCount}
          activated={null}
          paddleAvailable={billing.paddleCheckoutAvailable}
        />
      ) : (
        <p className="text-sm text-[var(--ent-muted)]">
          Contact your INTERTEXE account team to adjust entitlements for this workspace.
        </p>
      )}
    </EntModulePage>
  );
}
