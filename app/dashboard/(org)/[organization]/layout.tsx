import { connection } from "next/server";
import { DM_Sans } from "next/font/google";
import { redirect } from "next/navigation";
import { requireOrganizationAccess } from "../../../../lib/enterprise/access";
import { countActiveProducts } from "../../../../lib/enterprise/billing-gates";
import { isReservedHqSlug } from "../../../../lib/enterprise/constants";
import { loadOrgOverview } from "../../../../lib/enterprise/queries";
import { isPilotPlan } from "../../../../lib/enterprise/pricing";
import { EnterpriseShell } from "../../components/EnterpriseShell";
import "../../enterprise-theme.css";
import "../../enterprise-premium.css";
import "../../enterprise-product-intel.css";

const entSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-ent-sans",
  weight: ["400", "500", "600", "700"],
});

export const dynamic = "force-dynamic";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organization: string }>;
}) {
  await connection();
  const { organization } = await params;
  if (isReservedHqSlug(organization)) redirect("/dashboard");

  const { actor, membership, client } = await requireOrganizationAccess(organization);
  if (membership.role === "supplier_contributor") {
    redirect("/dashboard/supplier");
  }

  const pilotWorkspace = isPilotPlan(membership.plan);
  const pilotStatus = pilotWorkspace
    ? await Promise.all([
        countActiveProducts(client, membership.organizationId),
        loadOrgOverview(client, membership.organizationId),
      ]).then(([productCount, overview]) => ({
        productCount,
        processedCount: Math.max(
          productCount,
          overview.readyCount +
            overview.publishedCount +
            (overview.productStateCounts.review_required || 0)
        ),
      }))
    : null;

  return (
    <div className={entSans.variable}>
      <EnterpriseShell
        email={actor.email}
        fullName={actor.fullName}
        organizationName={membership.name}
        organizationSlug={membership.slug}
        role={membership.role}
        plan={membership.plan}
        workspaceContexts={actor.contexts}
        founderHq={actor.hq}
        pilotStatus={pilotStatus}
      >
        {children}
      </EnterpriseShell>
    </div>
  );
}
