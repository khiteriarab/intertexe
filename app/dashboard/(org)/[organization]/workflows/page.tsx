import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { canMutateEnterprise } from "../../../../../lib/enterprise/roles";
import { loadOrgWorkflow } from "../../../../../lib/enterprise/workflow";
import { EntWorkflowBoard, EntWorkflowCalendar } from "../../../components/EntWorkflowBoard";
import { EntModuleMetrics, EntModulePage } from "../../../components/EnterpriseModuleUi";

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

  const activeStages = data.stages.filter((s) => s.status === "active").length;
  const assignedStages = data.stages.filter((s) => s.assignment.profileId).length;
  const supplierDueCount = data.calendarEvents.filter((e) => e.kind === "supplier").length;

  return (
    <EntModulePage
      title="Workflows"
      meta={
        <>
          <span>
            <strong>{assignedStages}</strong> stages assigned
          </span>
          <span>
            <strong>{activeStages}</strong> active now
          </span>
          <span>
            <strong>{data.calendarEvents.length}</strong> dated entries
          </span>
          {supplierDueCount > 0 ? (
            <span>
              <strong>{supplierDueCount}</strong> supplier due dates
            </span>
          ) : null}
        </>
      }
    >
      <EntModuleMetrics
        items={[
          { label: "Workflow stages", value: data.stages.length },
          { label: "Assigned owners", value: assignedStages },
          { label: "Active stages", value: activeStages, accent: activeStages > 0 },
          { label: "Calendar entries", value: data.calendarEvents.length },
        ]}
      />

      <div className="grid xl:grid-cols-[1.35fr_1fr] gap-6 mb-8">
        <section>
          <div className="mb-5">
            <p className="ent-section-eyebrow">Passport workflow</p>
            <h2 className="ent-section-title">Stage assignments</h2>
            <p className="text-sm text-[var(--ent-muted)] mt-2 max-w-2xl">
              Assign responsibility at the stage level. Roles govern permissions; assignments govern who owns each step.
              Product-level assignments will extend this view later.
            </p>
          </div>
          <EntWorkflowBoard slug={membership.slug} data={data} canEdit={canEdit} />
        </section>

        <EntWorkflowCalendar events={data.calendarEvents} />
      </div>
    </EntModulePage>
  );
}
