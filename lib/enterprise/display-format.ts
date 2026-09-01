/** Display-only formatters for enterprise dashboard UI — no data layer changes. */

export function formatRelativeActivityTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export type ActivityFeedLine = {
  headline: string;
  detail: string;
};

/** Split activity_events.title into headline + detail for the editorial feed. */
export function parseActivityFeedLine(title: string): ActivityFeedLine {
  const raw = String(title || "").trim();
  if (!raw) return { headline: "Activity", detail: "" };

  const published = raw.match(/^Published passport\s+(.+)$/i);
  if (published) {
    return { headline: "Published passport", detail: published[1] };
  }

  const imported = raw.match(/^Imported\s+(\d+)\s+products?\s+from\s+(.+)$/i);
  if (imported) {
    return { headline: "Imported products", detail: `${imported[1]} rows · ${imported[2]}` };
  }

  const updated = raw.match(/^Updated material composition\s*[—–-]?\s*(.+)$/i);
  if (updated) {
    return { headline: "Updated material composition", detail: updated[1] };
  }

  const approved = raw.match(/^Approved field\s+(.+?)\s*[—–-]\s*(.+)$/i);
  if (approved) {
    return { headline: `Approved ${approved[1]}`, detail: approved[2] };
  }

  const dash = raw.indexOf(" — ");
  if (dash > 0) {
    return { headline: raw.slice(0, dash).trim(), detail: raw.slice(dash + 3).trim() };
  }

  return { headline: raw, detail: "" };
}

/** Present composition strings with clearer typography — display only. */
export function formatCompositionDisplay(composition: string | null | undefined): string {
  const raw = String(composition || "").trim();
  if (!raw) return "—";
  return raw
    .replace(/\s*\/\s*/g, " · ")
    .replace(/\s*,\s*/g, " · ")
    .replace(/\s+/g, " ");
}

/** Split composition into editorial lines, e.g. "98% Cotton" / "2% Elastane". */
export function formatCompositionLines(composition: string | null | undefined): string[] {
  const raw = String(composition || "").trim();
  if (!raw) return [];
  return raw
    .split(/[,;/·]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export type ActivityDateGroup = "Today" | "Yesterday" | "Earlier";

export function activityDateGroup(value: string | null | undefined): ActivityDateGroup {
  if (!value) return "Earlier";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

export function padCount(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Turn dotted requirement keys into readable labels — technical key preserved separately. */
export function humanizeFieldKey(key: string | null | undefined): string {
  const raw = String(key || "").trim();
  if (!raw) return "Requirement";
  const parts = raw.split(".").filter(Boolean);
  const slice = parts.length >= 2 ? parts.slice(-2) : parts;
  return slice
    .map((part) =>
      part
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    )
    .join(" ");
}
