import { redirect } from "next/navigation";
import { requireDashboardActor } from "../../../lib/enterprise/access";
import { HqCard, HqPageHeader } from "../components/HqUi";

export const dynamic = "force-dynamic";

export default async function SupplierPortalPage() {
  const actor = await requireDashboardActor();
  const supplierOrgs = actor.memberships.filter((item) => item.role === "supplier_contributor");
  if (!supplierOrgs.length) {
    if (actor.hq) redirect("/dashboard");
    const first = actor.contexts.find((item) => item.type === "org");
    if (first) redirect(first.href);
    redirect("/dashboard/login");
  }

  return (
    <div className="min-h-screen bg-[#f6f5f3] px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <HqPageHeader
          title="Supplier requests"
          description="You can only see requests assigned to you. Submissions are reviewed before they become canonical product information."
        />
        {supplierOrgs.map((org) => (
          <HqCard key={org.organizationId} title={org.name}>
            <p className="text-sm text-black/55">
              Assigned requests will appear here after a brand user sends a supplier request. Unrelated
              products in {org.name} are not visible.
            </p>
          </HqCard>
        ))}
      </div>
    </div>
  );
}
