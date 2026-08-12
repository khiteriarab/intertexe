import { render } from "@react-email/render";
import type { SupabaseClient } from "@supabase/supabase-js";
import LifecycleCheckpointEmail from "../emails/LifecycleCheckpointEmail";
import {
  EMAIL_FROM_FOUNDER,
  EMAIL_REPLY_TO,
  EMAIL_TYPES,
  LIFECYCLE_BRANCHES,
  lifecycleEmailTypeForDay,
  type LifecycleCheckpointDay,
} from "./email-constants";
import { claimTypedEmailSend } from "./email-deliveries";
import {
  cohortWindowIso,
  loadLifecycleSignals,
  resolveLifecycleBranch,
} from "./lifecycle-behavior";
import { copyForLifecycleBranch } from "./lifecycle-copy";
import { sendCustomerEmail } from "./resend-customer";

export type LifecycleCandidate = {
  userId: string;
  email: string;
  firstName: string;
  cohortAt: string;
};

/**
 * Day 25 review/winback honor marketing opt-out.
 * Day 4/10 + Day 25 feedback remain onboarding/support (still skip hard suppress via bounce path).
 */
export function shouldHonorMarketingOptOut(
  day: LifecycleCheckpointDay,
  branch: string
): boolean {
  if (day !== 25) return false;
  return (
    branch === LIFECYCLE_BRANCHES.DAY25_ACTIVE_REVIEW ||
    branch === LIFECYCLE_BRANCHES.DAY25_INACTIVE_WINBACK
  );
}

/** Users due for a checkpoint: founder_welcome sent in [day, day+1) ago, else auth.users created_at. */
export async function listLifecycleCandidates(
  supabase: SupabaseClient,
  day: LifecycleCheckpointDay
): Promise<LifecycleCandidate[]> {
  const { since, until } = cohortWindowIso(day);
  const emailType = lifecycleEmailTypeForDay(day);
  const byUser = new Map<string, LifecycleCandidate>();

  const { data: welcomes } = await supabase
    .from("email_deliveries")
    .select("user_id, email, sent_at")
    .eq("email_type", EMAIL_TYPES.FOUNDER_WELCOME)
    .in("status", ["sent", "delivered"])
    .not("user_id", "is", null)
    .gte("sent_at", since)
    .lt("sent_at", until)
    .limit(500);

  for (const row of welcomes || []) {
    if (!row.user_id || !row.email) continue;
    byUser.set(String(row.user_id), {
      userId: String(row.user_id),
      email: String(row.email).toLowerCase(),
      firstName: "",
      cohortAt: row.sent_at || since,
    });
  }

  // Fallback cohort: auth.users created in the same window (covers pre-logging signups).
  let page = 1;
  while (page <= 5) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const user of data.users) {
      if (!user.id || !user.email || !user.created_at) continue;
      const created = user.created_at;
      if (created < since || created >= until) continue;
      if (byUser.has(user.id)) continue;
      const meta = (user.user_metadata || {}) as Record<string, unknown>;
      const firstName =
        (typeof meta.first_name === "string" && meta.first_name) ||
        (typeof meta.name === "string" && String(meta.name).split(" ")[0]) ||
        "";
      byUser.set(user.id, {
        userId: user.id,
        email: user.email.toLowerCase(),
        firstName,
        cohortAt: created,
      });
    }
    if (data.users.length < 200) break;
    page++;
  }

  // Drop anyone who already has this checkpoint claimed/sent.
  const userIds = [...byUser.keys()];
  if (userIds.length) {
    const { data: existing } = await supabase
      .from("email_deliveries")
      .select("user_id")
      .eq("email_type", emailType)
      .in("status", ["pending", "sent", "delivered"])
      .in("user_id", userIds);
    for (const row of existing || []) {
      if (row.user_id) byUser.delete(String(row.user_id));
    }
  }

  // Fill first names from preferences / auth for welcome cohort rows.
  const out = [...byUser.values()];
  for (const candidate of out) {
    if (candidate.firstName) continue;
    const { data: pref } = await supabase
      .from("user_preferences")
      .select("first_name")
      .eq("user_id", candidate.userId)
      .maybeSingle();
    if (pref?.first_name) {
      candidate.firstName = String(pref.first_name);
      continue;
    }
    const { data: authUser } = await supabase.auth.admin.getUserById(candidate.userId);
    const meta = (authUser?.user?.user_metadata || {}) as Record<string, unknown>;
    candidate.firstName =
      (typeof meta.first_name === "string" && meta.first_name) ||
      (typeof meta.name === "string" && String(meta.name).split(" ")[0]) ||
      "";
  }

  return out;
}

export async function isMarketingSuppressed(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("user_preferences")
    .select("marketing_emails, unsubscribed_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return false;
  return data.marketing_emails === false || Boolean(data.unsubscribed_at);
}

export async function sendLifecycleCheckpointForUser(
  supabase: SupabaseClient,
  day: LifecycleCheckpointDay,
  candidate: LifecycleCandidate
): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  branch?: string;
  deliveryId?: string;
}> {
  const emailType = lifecycleEmailTypeForDay(day);
  const signals = await loadLifecycleSignals(supabase, candidate.userId);
  const branch = resolveLifecycleBranch(day, signals);

  if (shouldHonorMarketingOptOut(day, branch)) {
    if (await isMarketingSuppressed(supabase, candidate.userId)) {
      return { ok: true, skipped: true, reason: "marketing_opt_out", branch };
    }
  }

  const copy = copyForLifecycleBranch(branch, candidate.firstName);
  const claim = await claimTypedEmailSend(supabase, {
    emailType,
    userId: candidate.userId,
    email: candidate.email,
    metadata: {
      checkpoint_day: day,
      branch,
      cohort_at: candidate.cohortAt,
      signals: {
        hasScan: signals.hasScan,
        hasFavorite: signals.hasFavorite,
        hasTxMatch: signals.hasTxMatch,
        recentlyActive: signals.recentlyActive,
        hasBadExperience: signals.hasBadExperience,
      },
      classification:
        day === 25 && branch !== LIFECYCLE_BRANCHES.DAY25_FEEDBACK
          ? "lifecycle_engagement"
          : "lifecycle_onboarding",
    },
  });

  if (claim.action === "skip") {
    return {
      ok: true,
      skipped: true,
      reason: claim.reason,
      branch,
      deliveryId: claim.deliveryId,
    };
  }

  const html = await render(
    LifecycleCheckpointEmail({
      preview: copy.preview,
      hook: copy.hook,
      body: copy.body,
      ctaLabel: copy.ctaLabel,
      ctaUrl: copy.ctaUrl,
      closing: copy.closing,
    })
  );

  const result = await sendCustomerEmail({
    to: candidate.email,
    subject: copy.subject,
    html,
    emailType,
    userId: candidate.userId,
    from: EMAIL_FROM_FOUNDER,
    replyTo: EMAIL_REPLY_TO,
    deliveryId: claim.deliveryId,
    metadata: {
      checkpoint_day: day,
      branch,
    },
  });

  return {
    ok: result.ok,
    branch,
    deliveryId: result.deliveryId,
    reason: result.error,
  };
}
