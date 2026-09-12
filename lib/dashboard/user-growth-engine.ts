/**
 * User growth engine — combines account totals, weekly signups, and email levers
 * for the HQ Email Engine growth dashboard (25k users by 2027).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchFounderToday } from "./command-center";
import { fetchEmailEngineBundle, type EmailEngineBundle } from "./email-engine";
import { getServerSupabase } from "../supabase-service-client";
import {
  buildWeeklyUserTrajectory,
  computeUserGrowthPace,
  EMAIL_GROWTH_LEVERS,
  USER_GROWTH_MILESTONES,
  USER_GROWTH_TARGET,
  type UserGrowthTrajectoryPoint,
} from "./user-growth-plan";

export type WeeklySignupRow = {
  weekStart: string;
  signups: number;
};

export type EmailLeverRow = {
  label: string;
  stage: string;
  color: string;
  sent7d: number;
  delivered7d: number;
};

export type UserGrowthEngineBundle = {
  accounts: {
    total: number;
    today: number;
    d7: number;
    d30: number;
  };
  activated: {
    total: number;
    d7: number;
  };
  activationRate: number | null;
  pace: ReturnType<typeof computeUserGrowthPace>;
  milestones: typeof USER_GROWTH_MILESTONES;
  trajectory: UserGrowthTrajectoryPoint[];
  weeklySignups: WeeklySignupRow[];
  emailLevers: EmailLeverRow[];
  email: EmailEngineBundle;
  fetchedAt: string;
};

function startOfUtcWeek(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  out.setUTCDate(out.getUTCDate() + diff);
  return out;
}

function isoWeekStart(d: Date): string {
  return startOfUtcWeek(d).toISOString().slice(0, 10);
}

async function fetchWeeklySignups(supabase: SupabaseClient, weeks = 16): Promise<WeeklySignupRow[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - weeks * 7);

  const { data, error } = await supabase
    .from("user_preferences")
    .select("user_id, first_touch_at, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true })
    .limit(5000);

  if (error) {
    console.error("user-growth-engine weekly signups:", error.message);
    return [];
  }

  const buckets = new Map<string, number>();
  for (let i = 0; i < weeks; i += 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i * 7);
    buckets.set(isoWeekStart(d), 0);
  }

  for (const row of data || []) {
    const at = row.first_touch_at || row.created_at;
    if (!at) continue;
    const key = isoWeekStart(new Date(at));
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, signups]) => ({ weekStart, signups }));
}

function buildEmailLevers(email: EmailEngineBundle): EmailLeverRow[] {
  const byType = new Map(email.programs.map((p) => [p.emailType, p]));
  return EMAIL_GROWTH_LEVERS.map((lever) => {
    const program = byType.get(lever.emailType);
    return {
      label: lever.label,
      stage: lever.stage,
      color: lever.color,
      sent7d: program?.sent7d ?? 0,
      delivered7d: program?.delivered7d ?? 0,
    };
  });
}

export async function fetchUserGrowthEngineBundle(workspaceId: string): Promise<UserGrowthEngineBundle> {
  const fetchedAt = new Date().toISOString();
  const [founder, email] = await Promise.all([
    fetchFounderToday(workspaceId),
    fetchEmailEngineBundle(),
  ]);

  const accounts = {
    total: founder.accounts.total ?? 0,
    today: founder.accounts.today ?? 0,
    d7: founder.accounts.d7 ?? 0,
    d30: founder.accounts.d30 ?? 0,
  };
  const activated = {
    total: founder.activated.total ?? 0,
    d7: founder.activated.d7 ?? 0,
  };
  const activationRate =
    accounts.total > 0 && activated.total != null
      ? Math.round((activated.total / accounts.total) * 1000) / 10
      : null;

  const supabase = getServerSupabase();
  const weeklySignups = supabase ? await fetchWeeklySignups(supabase) : [];

  const pace = computeUserGrowthPace({
    currentTotal: accounts.total,
    signups7d: accounts.d7,
    asOfIso: fetchedAt,
  });

  const trajectory = buildWeeklyUserTrajectory({
    currentTotal: accounts.total,
    weeklyActual: weeklySignups,
    asOfIso: fetchedAt,
  });

  return {
    accounts,
    activated,
    activationRate,
    pace,
    milestones: USER_GROWTH_MILESTONES,
    trajectory,
    weeklySignups,
    emailLevers: buildEmailLevers(email),
    email,
    fetchedAt,
  };
}

export { USER_GROWTH_TARGET };
