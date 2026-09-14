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

export function parseIssueDetailJson(detail: string | null | undefined): Record<string, unknown> {
  if (!detail) return {};
  try {
    const parsed = JSON.parse(detail);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export type IssueNote = { at: string; authorId: string | null; authorName: string; text: string };

export function parseIssueNotes(detail: string | null | undefined): IssueNote[] {
  const parsed = parseIssueDetailJson(detail);
  const notes = parsed.notes;
  if (!Array.isArray(notes)) return [];
  return notes
    .map((row) => {
      const note = row as Record<string, unknown>;
      const text = String(note.text || "").trim();
      if (!text) return null;
      return {
        at: String(note.at || ""),
        authorId: note.authorId ? String(note.authorId) : null,
        authorName: String(note.authorName || "Team member"),
        text,
      };
    })
    .filter(Boolean) as IssueNote[];
}

export function issueWithinPeriod(iso: string | null | undefined, period: string): boolean {
  if (period === "all") return true;
  if (!iso) return false;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  const months = period === "30d" ? 0 : period === "90d" ? 3 : 12;
  if (period === "30d") return Date.now() - then <= 30 * 86400000;
  if (period === "90d") return Date.now() - then <= 90 * 86400000;
  return Date.now() - then <= 365 * 86400000;
}

export function isOriginIssue(input: {
  title: string;
  issue_type: string;
  detail?: string | null;
  original_value?: string | null;
  interpreted_value?: string | null;
}): boolean {
  if (/origin|country|made in/i.test(input.title)) return true;
  const parsed = parseIssueDetailJson(input.detail);
  const fieldKey = String(parsed.field_key || parsed.fieldKey || "").toLowerCase();
  if (/origin|country|manufacturing_country/.test(fieldKey)) return true;
  if (input.original_value && countryFlagEmoji(input.original_value)) return true;
  if (input.interpreted_value && countryFlagEmoji(input.interpreted_value)) return true;
  return false;
}

/** @deprecated use isOriginIssue */
export function isOriginConflictIssue(title: string, issueType: string): boolean {
  return isOriginIssue({ title, issue_type: issueType });
}

export function isCompositionConflictIssue(title: string, issueType: string): boolean {
  return issueType === "conflict" && /composition/i.test(title);
}
