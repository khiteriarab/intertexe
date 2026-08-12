export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { LIFECYCLE_CHECKPOINTS } from "@/lib/email-constants";
import {
  listLifecycleCandidates,
  sendLifecycleCheckpointForUser,
} from "@/lib/lifecycle-send";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Behavior-first lifecycle router.
 * For each checkpoint day (4 / 10 / 25): find cohort due today → load behavior → one email → one CTA.
 *
 * Does NOT send fixed Week 1/2/3 drips.
 */
export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  const supabase = createServiceClient();
  const summary: Record<
    string,
    { candidates: number; sent: number; skipped: number; failed: number; branches: Record<string, number> }
  > = {};

  for (const day of LIFECYCLE_CHECKPOINTS) {
    const key = `day${day}`;
    summary[key] = { candidates: 0, sent: 0, skipped: 0, failed: 0, branches: {} };

    const candidates = await listLifecycleCandidates(supabase, day);
    summary[key].candidates = candidates.length;

    for (const candidate of candidates) {
      try {
        const result = await sendLifecycleCheckpointForUser(supabase, day, candidate);
        const branch = result.branch || "unknown";
        summary[key].branches[branch] = (summary[key].branches[branch] || 0) + 1;
        if (result.skipped) summary[key].skipped++;
        else if (result.ok) summary[key].sent++;
        else summary[key].failed++;
      } catch (err) {
        summary[key].failed++;
        console.error(`lifecycle day${day} failed for ${candidate.userId}:`, err);
      }
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return NextResponse.json({ ok: true, summary });
}
