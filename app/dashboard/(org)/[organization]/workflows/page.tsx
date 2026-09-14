import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { canMutateEnterprise } from "../../../../../lib/enterprise/roles";
import { loadOrgWorkflow, PASSPORT_WORKFLOW_DISPLAY_IDS } from "../../../../../lib/enterprise/workflow";
import { EntWorkflowBoard, EntWorkflowCalendar } from "../../../components/EntWorkflowBoard";
import { EntOpsMetaLine, EntOpsPageHeader } from "../../../components/EntOpsModuleUi";
import { EntOpsKpiRow } from "../../../components/EntOpsModuleUi";
import { entLinkClass } from "../../../components/EnterpriseUi";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const data = await loadOrgWorkflow(client, membership.organizationId, membership.slug);
  const canEdit = canMutateEnterprise(membership.role);
  const base = `/dashboard/${membership.slug}`;

  const displayStages = data.stages.filter((s) => PASSPORT_WORKFLOW_DISPLAY_IDS.includes(s.id));
  const activeStages = displayStages.filter((s) => s.status === "active").length;
  const assignedStages = displayStages.filter((s) => s.assignment.profileId).length;
  const supplierDueCount = data.calendarEvents.filter((e) => e.kind === "supplier").length;

  return (
    <div className="ent-opsmod-page">
      <EntOpsPageHeader
        title="Workflows"
        subtitle="Assign stage owners, track due dates, and coordinate passport publishing."
        meta={
          <EntOpsMetaLine
            items={[
              <>
                <strong>{assignedStages}</strong> stages assigned
              </>,
              <>
                <strong>{activeStages}</strong> active now
              </>,
              <>
                <strong>{data.calendarEvents.length}</strong> calendar entries
              </>,
              supplierDueCount > 0 ? (
                <>
                  <strong>{supplierDueCount}</strong> supplier due date{supplierDueCount === 1 ? "" : "s"}
                </>
              ) : (
                <>No supplier due dates</>
              ),
              <Link href={`${base}/regulations`} className={entLinkClass}>
                Regulatory readiness →
              </Link>,
            ]}
          />
        }
      />

      <EntOpsKpiRow
        items={[
          { id: "stages", label: "Workflow stages", value: displayStages.length, icon: "▣" },
          { id: "owners", label: "Assigned owners", value: assignedStages, icon: "👤" },
          {
            id: "active",
            label: "Active stages",
            value: activeStages,
            hint: activeStages > 0 ? "In progress" : "Idle",
            icon: "▶",
          },
          { id: "calendar", label: "Calendar entries", value: data.calendarEvents.length, icon: "📅" },
        ]}
      />

      <div className="ent-opsmod-split ent-opsmod-split--workflows">
        <EntWorkflowBoard
          slug={membership.slug}
          data={data}
          canEdit={canEdit}
          displayStageIds={[...PASSPORT_WORKFLOW_DISPLAY_IDS]}
        />
        <EntWorkflowCalendar events={data.calendarEvents} base={base} />
      </div>
    </div>
  );
}
