import type { SupabaseClient } from "@supabase/supabase-js";
import { listApprovalRequests } from "./approvals";
import { loadImportHistory } from "./import-ops";
import { loadOrgFiles, loadOrgActivityFeed, loadOrgSuppliers } from "./module-queries";
import { loadOrgOverview } from "./queries";
import { loadOrgMemberDirectory, type ReviewerIdentity } from "./reviewer-display";

export type OperationsJourneyStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  status: "complete" | "active" | "upcoming";
};

export type OperationsKpi = {
  id: string;
  label: string;
  value: number;
  hint: string;
  trend: string | null;
  href: string;
  icon: string;
};

export type OperationsDashboardData = {
  kpis: OperationsKpi[];
  journey: OperationsJourneyStep[];
  journeyComplete: number;
  journeyTotal: number;
  journeyPct: number;
  nextStep: {
    title: string;
    body: string;
    href: string;
    label: string;
  };
  workspace: {
    imports: { href: string; importsThisWeek: number; withErrors: number };
    approvals: { href: string; pending: number; newToday: number };
    suppliers: { href: string; awaitingResponse: number; activeCount: number };
    files: { href: string; sourceRecords: number; assetsLabel: string };
  };
  activity: Array<{
    id: string;
    title: string;
    detail: string | null;
    created_at: string;
    icon: string;
  }>;
  team: {
    members: ReviewerIdentity[];
    inProgress: number;
    needsReview: number;
    readyToPublish: number;
  };
};

const JOURNEY_DEFS = [
  {
    id: "import",
    label: "Import catalog",
    description: "Ingest product data from suppliers",
    path: "/products?import=1",
  },
  {
    id: "review",
    label: "Review fields",
    description: "Compare source vs. canonical data",
    path: "/products",
  },
  {
    id: "issues",
    label: "Resolve issues",
    description: "Address blocking findings and gaps",
    path: "/issues",
  },
  {
    id: "evidence",
    label: "Request evidence",
    description: "Collect supplier documentation",
    path: "/suppliers",
  },
  {
    id: "approve",
    label: "Approve",
    description: "Field and publish approval",
    path: "/approvals",
  },
  {
    id: "publish",
    label: "Publish passports",
    description: "Create and version digital product passports",
    path: "/passports",
  },
] as const;

function isWithinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  return Date.now() - then <= days * 86_400_000;
}

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function activityIcon(title: string): string {
  if (/publish/i.test(title)) return "⬡";
  if (/import/i.test(title)) return "↓";
  if (/approv/i.test(title)) return "✓";
  if (/issue|conflict|missing/i.test(title)) return "!";
  if (/supplier|evidence/i.test(title)) return "🏭";
  if (/composition|material|field/i.test(title)) return "◈";
  if (/signal|consumer/i.test(title)) return "◎";
  return "•";
}

function deriveNextStep(input: {
  base: string;
  productCount: number;
  issueCount: number;
  reviewRequired: number;
  supplierRequestsOpen: number;
  pendingApprovals: number;
  readyCount: number;
}): OperationsDashboardData["nextStep"] {
  const { base, productCount, issueCount, reviewRequired, supplierRequestsOpen, pendingApprovals, readyCount } = input;
  if (productCount === 0) {
    return {
      title: "Import your catalog",
      body: "Upload a CSV of products to begin the operational workflow.",
      href: `${base}/products?import=1`,
      label: "Import catalog",
    };
  }
  if (issueCount > 0) {
    return {
      title: "Resolve open issues",
      body: `${issueCount} blocking finding${issueCount === 1 ? "" : "s"} must be addressed before you can publish passports.`,
      href: `${base}/issues`,
      label: "Review issues",
    };
  }
  if (reviewRequired > 0) {
    return {
      title: "Review product fields",
      body: `${reviewRequired} product${reviewRequired === 1 ? "" : "s"} still need field review and approval.`,
      href: `${base}/products?state=review_required`,
      label: "Review fields",
    };
  }
  if (supplierRequestsOpen > 0) {
    return {
      title: "Follow up on supplier evidence",
      body: `${supplierRequestsOpen} supplier request${supplierRequestsOpen === 1 ? "" : "s"} awaiting response or review.`,
      href: `${base}/suppliers`,
      label: "Open suppliers",
    };
  }
  if (pendingApprovals > 0) {
    return {
      title: "Clear pending approvals",
      body: `${pendingApprovals} approval request${pendingApprovals === 1 ? "" : "s"} need a decision before publishing.`,
      href: `${base}/approvals`,
      label: "Review approvals",
    };
  }
  if (readyCount > 0) {
    return {
      title: "Publish ready passports",
      body: `${readyCount} product${readyCount === 1 ? "" : "s"} meet requirements and can be published now.`,
      href: `${base}/passports`,
      label: "Publish passports",
    };
  }
  return {
    title: "Review your catalog",
    body: "Open products to compare source data, approve fields, and move toward publication.",
    href: `${base}/products`,
    label: "Open products",
  };
}

export async function loadOperationsDashboard(
  client: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<OperationsDashboardData> {
  const base = `/dashboard/${slug}`;
  const [overview, imports, pendingApprovals, allApprovals, suppliers, files, activity, members, fileBytes] = await Promise.all([
    loadOrgOverview(client, organizationId),
    loadImportHistory(client, organizationId, 100),
    listApprovalRequests(client, organizationId, "pending"),
    listApprovalRequests(client, organizationId),
    loadOrgSuppliers(client, organizationId),
    loadOrgFiles(client, organizationId),
    loadOrgActivityFeed(client, organizationId, 8),
    loadOrgMemberDirectory(client, organizationId),
    client.from("files").select("byte_size").eq("organization_id", organizationId),
  ]);

  const reviewRequired = overview.productStateCounts.review_required || 0;
  const supplierRequestsOpen = suppliers.summary.openRequests;
  const pendingApprovalCount = pendingApprovals.length;
  const importsThisWeek = imports.filter((row) => isWithinDays(row.createdAt, 7));
  const importsWithErrors = importsThisWeek.filter((row) => row.errorCount > 0).length;
  const approvalsNewToday = allApprovals.filter((row) => row.status === "pending" && isToday(row.created_at)).length;

  const gates = {
    import: overview.productCount > 0,
    review: overview.productCount > 0 && reviewRequired === 0,
    issues: overview.productCount > 0 && overview.issueCount === 0,
    evidence: overview.productCount > 0 && supplierRequestsOpen === 0,
    approve: overview.productCount > 0 && pendingApprovalCount === 0,
    publish: overview.publishedCount > 0,
  };

  let activeAssigned = false;
  const journey: OperationsJourneyStep[] = JOURNEY_DEFS.map((def) => {
    const complete = gates[def.id as keyof typeof gates];
    let status: OperationsJourneyStep["status"] = "upcoming";
    if (complete) status = "complete";
    else if (!activeAssigned && overview.productCount >= 0) {
      status = "active";
      activeAssigned = true;
    }
    return {
      id: def.id,
      label: def.label,
      description: def.description,
      href: `${base}${def.path}`,
      status,
    };
  });

  const journeyComplete = journey.filter((s) => s.status === "complete").length;
  const journeyTotal = journey.length;
  const journeyPct = Math.round((journeyComplete / journeyTotal) * 100);

  const activeWorkflows = Math.max(
    0,
    overview.productCount - (overview.productStateCounts.published || 0)
  );

  const totalBytes = (fileBytes.data || []).reduce((sum, row) => sum + Number(row.byte_size || 0), 0);

  const kpis: OperationsKpi[] = [
    {
      id: "workflows",
      label: "Active workflows",
      value: activeWorkflows || overview.productCount,
      hint: "Products in the pipeline",
      trend: activeWorkflows > 0 ? "In motion" : null,
      href: `${base}/workflows`,
      icon: "◎",
    },
    {
      id: "approvals",
      label: "Approvals pending",
      value: pendingApprovalCount,
      hint: approvalsNewToday > 0 ? `${approvalsNewToday} new today` : "Awaiting decision",
      trend: pendingApprovalCount > 0 ? "Needs review" : "Clear",
      href: `${base}/approvals`,
      icon: "✓",
    },
    {
      id: "suppliers",
      label: "Supplier requests",
      value: supplierRequestsOpen,
      hint: supplierRequestsOpen > 0 ? "Awaiting response" : "No open requests",
      trend: supplierRequestsOpen > 0 ? "Outstanding" : null,
      href: `${base}/suppliers`,
      icon: "🏭",
    },
    {
      id: "imports",
      label: "Imports this week",
      value: importsThisWeek.length,
      hint: importsWithErrors > 0 ? `${importsWithErrors} with row errors` : "Catalog uploads",
      trend: importsThisWeek.length > 0 ? "Recent activity" : null,
      href: `${base}/imports`,
      icon: "↓",
    },
    {
      id: "passports",
      label: "Passports ready",
      value: overview.readyCount,
      hint: overview.readyCount > 0 ? "Ready to publish" : "None ready yet",
      trend: overview.readyCount > 0 ? "Action available" : null,
      href: `${base}/passports`,
      icon: "⬡",
    },
  ];

  const inProgress = Math.max(
    0,
    overview.productCount -
      overview.readyCount -
      (overview.productStateCounts.published || 0) -
      reviewRequired
  );
  const needsReview = reviewRequired + (overview.issueCount > 0 ? overview.issueCount : 0);

  return {
    kpis,
    journey,
    journeyComplete,
    journeyTotal,
    journeyPct,
    nextStep: deriveNextStep({
      base,
      productCount: overview.productCount,
      issueCount: overview.issueCount,
      reviewRequired,
      supplierRequestsOpen,
      pendingApprovals: pendingApprovalCount,
      readyCount: overview.readyCount,
    }),
    workspace: {
      imports: {
        href: `${base}/imports`,
        importsThisWeek: importsThisWeek.length,
        withErrors: importsWithErrors,
      },
      approvals: {
        href: `${base}/approvals`,
        pending: pendingApprovalCount,
        newToday: approvalsNewToday,
      },
      suppliers: {
        href: `${base}/suppliers`,
        awaitingResponse: supplierRequestsOpen,
        activeCount: suppliers.summary.total,
      },
      files: {
        href: `${base}/files`,
        sourceRecords: files.summary.sourceRecords,
        assetsLabel: formatBytes(totalBytes),
      },
    },
    activity: activity.map((row) => ({
      id: row.id,
      title: row.title,
      detail: row.detail,
      created_at: row.created_at,
      icon: activityIcon(row.title),
    })),
    team: {
      members: Array.from(members.values()).slice(0, 6),
      inProgress: inProgress || overview.productCount,
      needsReview: needsReview,
      readyToPublish: overview.readyCount,
    },
  };
}
