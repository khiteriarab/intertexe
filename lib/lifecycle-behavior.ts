import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LIFECYCLE_BRANCHES,
  type LifecycleBranch,
  type LifecycleCheckpointDay,
} from "./email-constants";

export type LifecycleSignals = {
  hasScan: boolean;
  hasFavorite: boolean;
  hasTxMatch: boolean;
  recentlyActive: boolean;
  hasBadExperience: boolean;
  scanCount: number;
  favoriteCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function hasAlternativesShown(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.length > 0 : Boolean(parsed);
    } catch {
      return value.length > 0 && value !== "false" && value !== "null";
    }
  }
  return false;
}

/** Load activation / engagement signals for one user. */
export async function loadLifecycleSignals(
  supabase: SupabaseClient,
  userId: string,
  opts?: { recentDays?: number }
): Promise<LifecycleSignals> {
  const recentDays = opts?.recentDays ?? 14;
  const recentSince = new Date(Date.now() - recentDays * DAY_MS).toISOString();

  const [scans, favorites, captures, feedback, recentScans, recentFavs, recentCaptures] =
    await Promise.all([
      supabase
        .from("scan_history")
        .select("id, alternatives_shown, alternative_clicked")
        .eq("user_id", userId)
        .limit(50),
      supabase
        .from("product_favorites")
        .select("id")
        .eq("user_id", userId)
        .limit(50),
      supabase
        .from("external_captures")
        .select("id, alternatives, resolution_status")
        .eq("user_id", userId)
        .limit(50),
      supabase
        .from("scan_feedback")
        .select("id, issue_type")
        .eq("user_id", userId)
        .limit(20),
      supabase
        .from("scan_history")
        .select("id")
        .eq("user_id", userId)
        .gte("scanned_at", recentSince)
        .limit(1),
      supabase
        .from("product_favorites")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", recentSince)
        .limit(1),
      supabase
        .from("external_captures")
        .select("id")
        .eq("user_id", userId)
        .gte("updated_at", recentSince)
        .limit(1),
    ]);

  const scanRows = scans.data || [];
  const favRows = favorites.data || [];
  const captureRows = captures.data || [];
  const feedbackRows = feedback.data || [];

  // Also count bare `scans` table if present for this user.
  const { data: legacyScans } = await supabase
    .from("scans")
    .select("id")
    .eq("user_id", userId)
    .limit(20);

  const hasScan = scanRows.length > 0 || (legacyScans || []).length > 0;
  const hasFavorite = favRows.length > 0;

  const hasTxMatch =
    scanRows.some(
      (row) =>
        hasAlternativesShown(row.alternatives_shown) || Boolean(row.alternative_clicked)
    ) ||
    captureRows.some((row) => {
      if (row.resolution_status === "alternatives_ready") return true;
      const alts = row.alternatives;
      return Array.isArray(alts) && alts.length > 0;
    });

  const recentlyActive =
    (recentScans.data || []).length > 0 ||
    (recentFavs.data || []).length > 0 ||
    (recentCaptures.data || []).length > 0;

  const hasBadExperience = feedbackRows.length > 0;

  return {
    hasScan,
    hasFavorite,
    hasTxMatch,
    recentlyActive,
    hasBadExperience,
    scanCount: scanRows.length + (legacyScans || []).length,
    favoriteCount: favRows.length,
  };
}

/**
 * Time checkpoint + behavior → one branch.
 * Priority within a day is intentional (do not ask for the next commitment early).
 */
export function resolveLifecycleBranch(
  day: LifecycleCheckpointDay,
  signals: LifecycleSignals
): LifecycleBranch {
  if (day === 4) {
    return signals.hasScan
      ? LIFECYCLE_BRANCHES.DAY4_HAS_SCAN
      : LIFECYCLE_BRANCHES.DAY4_NO_SCAN;
  }

  if (day === 10) {
    if (signals.hasFavorite) return LIFECYCLE_BRANCHES.DAY10_FAVORITES;
    if (signals.hasTxMatch) return LIFECYCLE_BRANCHES.DAY10_TX_MATCH;
    return LIFECYCLE_BRANCHES.DAY10_INACTIVE;
  }

  // Day 25
  if (signals.hasBadExperience) return LIFECYCLE_BRANCHES.DAY25_FEEDBACK;
  if (signals.recentlyActive || signals.hasScan || signals.hasFavorite) {
    return LIFECYCLE_BRANCHES.DAY25_ACTIVE_REVIEW;
  }
  return LIFECYCLE_BRANCHES.DAY25_INACTIVE_WINBACK;
}

/** Cohort window: account age in [day, day+1) days. */
export function cohortWindowIso(day: LifecycleCheckpointDay, now = new Date()) {
  const until = new Date(now.getTime() - day * DAY_MS);
  const since = new Date(now.getTime() - (day + 1) * DAY_MS);
  return { since: since.toISOString(), until: until.toISOString() };
}
