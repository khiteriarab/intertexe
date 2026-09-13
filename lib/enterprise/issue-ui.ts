/** Shared Issues inbox UI helpers — severity, status, country display. */

export type IssueSeverityTone = "critical" | "high" | "medium" | "low";
export type IssueStatusTone = "needs_review" | "open" | "in_progress" | "resolved";

export function normalizeIssueSeverity(severity: string): IssueSeverityTone {
  const s = String(severity || "").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium" || s === "moderate") return "medium";
  return "low";
}

export function issueSeverityLabel(severity: string): string {
  const tone = normalizeIssueSeverity(severity);
  if (tone === "critical") return "Critical";
  if (tone === "high") return "High";
  if (tone === "medium") return "Medium";
  return "Low";
}

/** Workflow status for inbox rows — distinct from issue_type. */
export function issueWorkflowStatus(input: {
  status: string;
  issue_type: string;
}): { label: string; tone: IssueStatusTone } {
  if (input.status !== "open") {
    return { label: "Resolved", tone: "resolved" };
  }
  if (input.issue_type === "conflict" || input.issue_type === "identifier" || input.issue_type === "validation") {
    return { label: "Needs review", tone: "needs_review" };
  }
  return { label: "Open", tone: "open" };
}

const COUNTRY_ALIASES: Record<string, string> = {
  portugal: "PT",
  italy: "IT",
  spain: "ES",
  france: "FR",
  germany: "DE",
  romania: "RO",
  lithuania: "LT",
  china: "CN",
  india: "IN",
  turkey: "TR",
  "united kingdom": "GB",
  uk: "GB",
  usa: "US",
  "united states": "US",
};

/** ISO 3166-1 alpha-2 → flag emoji (works in modern browsers). */
export function countryFlagEmoji(country: string | null | undefined): string | null {
  const raw = String(country || "").trim();
  if (!raw) return null;
  let code = raw.length === 2 ? raw.toUpperCase() : COUNTRY_ALIASES[raw.toLowerCase()];
  if (!code || code.length !== 2) return null;
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return null;
  return String.fromCodePoint(...[...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function formatIssueRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function isOriginConflictIssue(title: string, issueType: string): boolean {
  return issueType === "conflict" && /origin|country/i.test(title);
}

export function isCompositionConflictIssue(title: string, issueType: string): boolean {
  return issueType === "conflict" && /composition/i.test(title);
}
