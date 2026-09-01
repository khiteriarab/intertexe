import type { SupabaseClient } from "@supabase/supabase-js";
import { loadOrgOverview } from "./queries";
import { loadOrgMemberDirectory, type ReviewerIdentity } from "./reviewer-display";

export const WORKFLOW_ASSIGNMENT_SCOPE = "stage" as const;
/** Product-level assignments will extend WorkflowAssignment with productId — not built in V1. */
export type WorkflowAssignmentScope = typeof WORKFLOW_ASSIGNMENT_SCOPE | "product";

export const PASSPORT_WORKFLOW_STAGES = [
  {
    id: "import",
    label: "Catalog import",
    description: "Upload CSV, map columns, and confirm identifier reconciliation.",
    href: "/products?import=1",
    roleHint: "product_manager",
  },
  {
    id: "review",
    label: "Field review",
    description: "Approve identity, composition, and origin on each product.",
    href: "/products",
    roleHint: "reviewer",
  },
  {
    id: "issues",
    label: "Issue resolution",
    description: "Clear blocking findings and missing supplier evidence.",
    href: "/issues",
    roleHint: "sustainability",
  },
  {
    id: "publish",
    label: "Passport publishing",
    description: "Publish digital product passports when products are ready.",
    href: "/passports",
    roleHint: "product_manager",
  },
  {
    id: "compliance",
    label: "Regulatory readiness",
    description: "Track ESPR requirements and gaps across the catalog.",
    href: "/regulations",
    roleHint: "sustainability",
  },
] as const;

/** @deprecated use PASSPORT_WORKFLOW_STAGES */
export const DPP_WORKFLOW_STAGES = PASSPORT_WORKFLOW_STAGES;

export type WorkflowStageId = (typeof PASSPORT_WORKFLOW_STAGES)[number]["id"];

export type WorkflowAssignment = {
  stageId: WorkflowStageId;
  profileId: string | null;
  dueDate: string | null;
  updatedAt: string | null;
};

export type WorkflowCalendarEvent = {
  id: string;
  date: string;
  title: string;
  kind: "import" | "activity" | "due" | "publish" | "supplier";
  href?: string;
};

export type OrgWorkflowData = {
  stages: Array<{
    id: WorkflowStageId;
    label: string;
    description: string;
    href: string;
    roleHint: string;
    status: "complete" | "active" | "upcoming";
    count?: number;
    assignment: WorkflowAssignment;
  }>;
  members: ReviewerIdentity[];
  calendarEvents: WorkflowCalendarEvent[];
  assignments: Record<WorkflowStageId, WorkflowAssignment>;
};

const ASSIGNMENTS_KEY = "dpp_workflow_assignments";

export function parseWorkflowAssignments(
  entitlements: Record<string, unknown> | null | undefined
): Record<WorkflowStageId, WorkflowAssignment> {
  const raw = (entitlements?.[ASSIGNMENTS_KEY] || {}) as Record<string, Partial<WorkflowAssignment>>;
  const base = {} as Record<WorkflowStageId, WorkflowAssignment>;
  for (const stage of PASSPORT_WORKFLOW_STAGES) {
    const row = raw[stage.id];
    base[stage.id] = {
      stageId: stage.id,
      profileId: typeof row?.profileId === "string" ? row.profileId : null,
      dueDate: typeof row?.dueDate === "string" ? row.dueDate : null,
      updatedAt: typeof row?.updatedAt === "string" ? row.updatedAt : null,
    };
  }
  return base;
}

export function mergeWorkflowAssignments(
  entitlements: Record<string, unknown>,
  patch: Partial<Record<WorkflowStageId, Partial<WorkflowAssignment>>>
): Record<string, unknown> {
  const current = parseWorkflowAssignments(entitlements);
  const next = { ...current };
  const now = new Date().toISOString();
  for (const stage of PASSPORT_WORKFLOW_STAGES) {
    const row = patch[stage.id];
    if (!row) continue;
    next[stage.id] = {
      stageId: stage.id,
      profileId: row.profileId !== undefined ? row.profileId : current[stage.id].profileId,
      dueDate: row.dueDate !== undefined ? row.dueDate : current[stage.id].dueDate,
      updatedAt: now,
    };
  }
  return { ...entitlements, [ASSIGNMENTS_KEY]: next };
}

function stageStatus(
  stageId: WorkflowStageId,
  overview: Awaited<ReturnType<typeof loadOrgOverview>>
): "complete" | "active" | "upcoming" {
  switch (stageId) {
    case "import":
      return overview.productCount > 0 ? "complete" : "active";
    case "review":
      if (overview.productCount === 0) return "upcoming";
      return (overview.productStateCounts.review_required || 0) > 0 ? "active" : "complete";
    case "issues":
      if (overview.productCount === 0) return "upcoming";
      return overview.issueCount > 0 ? "active" : "complete";
    case "publish":
      if (overview.productCount === 0) return "upcoming";
      return overview.publishedCount > 0
        ? "complete"
        : overview.readyCount > 0
          ? "active"
          : "upcoming";
    case "compliance":
      if (overview.productCount === 0) return "upcoming";
      return overview.publishedCount > 0 ? "active" : "upcoming";
    default:
      return "upcoming";
  }
}

export async function loadOrgWorkflow(
  client: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<OrgWorkflowData> {
  const base = `/dashboard/${slug}`;
  const [overview, membersMap, orgRow, imports, activity, supplierRequests] = await Promise.all([
    loadOrgOverview(client, organizationId),
    loadOrgMemberDirectory(client, organizationId),
    client.from("organizations").select("entitlements").eq("id", organizationId).maybeSingle(),
    client
      .from("imports")
      .select("id, created_at, filename")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(12),
    client
      .from("activity_events")
      .select("id, title, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(24),
    client
      .from("supplier_requests")
      .select("id, due_at, created_at, status, supplier:suppliers(name), product:products(name)")
      .eq("organization_id", organizationId)
      .eq("status", "open")
      .not("due_at", "is", null)
      .order("due_at", { ascending: true })
      .limit(20),
  ]);

  const entitlements = (orgRow.data?.entitlements || {}) as Record<string, unknown>;
  const assignments = parseWorkflowAssignments(entitlements);
  const members = Array.from(membersMap.values()).filter((m) => m.id);

  const stages = DPP_WORKFLOW_STAGES.map((stage) => {
    const status = stageStatus(stage.id, overview);
    let count: number | undefined;
    if (stage.id === "review") count = overview.productStateCounts.review_required || 0;
    if (stage.id === "issues") count = overview.issueCount;
    if (stage.id === "publish") count = overview.readyCount;
    return {
      ...stage,
      href: `${base}${stage.href}`,
      status,
      count,
      assignment: assignments[stage.id],
    };
  });

  const calendarEvents: WorkflowCalendarEvent[] = [];

  for (const row of imports.data || []) {
    calendarEvents.push({
      id: `import-${row.id}`,
      date: String(row.created_at),
      title: `Catalog import${row.filename ? ` · ${row.filename}` : ""}`,
      kind: "import",
      href: `${base}/files`,
    });
  }

  for (const row of activity.data || []) {
    calendarEvents.push({
      id: `activity-${row.id}`,
      date: String(row.created_at),
      title: String(row.title || "Activity"),
      kind: /publish/i.test(String(row.title)) ? "publish" : "activity",
      href: `${base}/activity`,
    });
  }

  for (const row of supplierRequests.data || []) {
    const supplier = (row as { supplier?: { name?: string } | { name?: string }[] | null }).supplier;
    const product = (row as { product?: { name?: string } | { name?: string }[] | null }).product;
    const supplierName = Array.isArray(supplier) ? supplier[0]?.name : supplier?.name;
    const productName = Array.isArray(product) ? product[0]?.name : product?.name;
    const detail = [supplierName, productName].filter(Boolean).join(" · ");
    calendarEvents.push({
      id: `supplier-${row.id}`,
      date: String(row.due_at),
      title: `Supplier evidence due${detail ? ` · ${detail}` : ""}`,
      kind: "supplier",
      href: `${base}/suppliers`,
    });
  }

  for (const stage of PASSPORT_WORKFLOW_STAGES) {
    const due = assignments[stage.id].dueDate;
    if (!due) continue;
    calendarEvents.push({
      id: `due-${stage.id}`,
      date: due,
      title: `${stage.label} due`,
      kind: "due",
      href: `${base}${stage.href}`,
    });
  }

  calendarEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { stages, members, calendarEvents, assignments };
}
