import { getServerSupabase } from "../supabase-service-client";
import { createRequire } from "module";
import path from "path";

const require = createRequire(path.join(process.cwd(), "package.json"));
const {
  loadNightlySyncOps,
  loadFounderReports,
  nextScheduledRunIso,
  LATEST_KEY,
} = require("./lib/feed-sync/ops-monitor.cjs") as {
  loadNightlySyncOps: (sb: unknown) => Promise<{
    latest: NightlySyncRun | null;
    runs: NightlySyncRun[];
    nextScheduledRun: string;
  }>;
  loadFounderReports: (sb: unknown) => Promise<FounderReport[]>;
  nextScheduledRunIso: () => string;
  LATEST_KEY: string;
};

export type NightlySyncRun = {
  id?: string;
  status?: "success" | "warning" | "failure" | string;
  displayStatus?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  checkpointBefore?: number;
  checkpointAfter?: number;
  totalCatalogFiles?: number;
  filesProcessed?: number;
  inserted?: number;
  updated?: number;
  rejected?: number;
  upserted?: number;
  designersSynced?: number;
  errors?: string[];
  warnings?: string[];
  suggestedNextStep?: string | null;
  lastSuccessfulAt?: string | null;
  githubRunUrl?: string | null;
  emailSent?: boolean;
  emailError?: string | null;
  nextScheduledRun?: string;
  event?: string;
  source?: string;
};

export type FounderReport = {
  id: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  subject: string;
  catalog: Record<string, unknown>;
  commerce: Record<string, unknown>;
  consumers: Record<string, unknown>;
  acquisition: Record<string, unknown>;
  warnings: string[];
  emailSent?: boolean;
  emailError?: string | null;
};

export async function fetchNightlySyncOps() {
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      latest: null as NightlySyncRun | null,
      runs: [] as NightlySyncRun[],
      nextScheduledRun: nextScheduledRunIso(),
      lastSuccessfulAt: null as string | null,
    };
  }
  const ops = await loadNightlySyncOps(supabase);
  const lastSuccessfulAt =
    ops.latest?.status === "success"
      ? ops.latest.finishedAt || null
      : ops.runs.find((r) => r.status === "success")?.finishedAt ||
        ops.latest?.lastSuccessfulAt ||
        null;
  return {
    ...ops,
    lastSuccessfulAt,
  };
}

export async function fetchFounderReports() {
  const supabase = getServerSupabase();
  if (!supabase) return [] as FounderReport[];
  return loadFounderReports(supabase);
}

export function formatDuration(ms?: number | null) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return `${min}m ${rem}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

export function statusBadgeClass(status?: string) {
  if (status === "success") return "text-emerald-800 bg-emerald-50 border-emerald-200";
  if (status === "warning") return "text-amber-900 bg-amber-50 border-amber-200";
  if (status === "failure") return "text-red-800 bg-red-50 border-red-200";
  return "text-black/60 bg-black/5 border-black/10";
}

export { LATEST_KEY };
