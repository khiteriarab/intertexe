/**
 * Founder-only writes for the $50K command center.
 *
 * Every route requires the `founder` role. Nothing here is reachable from a
 * public or client-facing surface, and no response includes catalog or
 * consumer personal data.
 */
import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import { fetchRevenueCommandCenter } from "../../../../lib/dashboard/revenue-command-center";
import { REVENUE_STREAMS, DEFAULT_STAGES, scopeOfStream } from "../../../../lib/dashboard/revenue-plan";

export const dynamic = "force-dynamic";

const STREAM_KEYS = new Set(REVENUE_STREAMS.map((s) => s.key));
const STAGE_KEYS = new Set(DEFAULT_STAGES.map((s) => s.key));
const ACTIVITY_TYPES = new Set([
  "qualified_account",
  "personalized_outreach",
  "snapshot_sent",
  "meeting",
  "proposal",
]);
const MIGRATION_HINT = "Apply 20260820_hq_revenue_command_center.sql before recording revenue.";

async function requireFounder() {
  const session = await getHqSession();
  if (!session) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  if (!session.roles.includes("founder")) {
    return { error: NextResponse.json({ message: "Founder access required" }, { status: 403 }) };
  }
  const supabase = getServerSupabase();
  if (!supabase) {
    return { error: NextResponse.json({ message: "Database unavailable" }, { status: 503 }) };
  }
  return { session, supabase };
}

function missingTable(message: string | undefined): boolean {
  return Boolean(message && /does not exist|schema cache|could not find/i.test(message));
}

function failed(message: string | undefined) {
  if (missingTable(message)) {
    return NextResponse.json({ message: MIGRATION_HINT }, { status: 503 });
  }
  return NextResponse.json({ message: "Could not save this record." }, { status: 500 });
}

function text(value: unknown, max = 200): string {
  return String(value ?? "").trim().slice(0, max);
}

function money(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function isoDateOrNull(value: unknown): string | null {
  const raw = text(value, 40);
  if (!raw) return null;
  const parsed = Date.parse(raw.length === 10 ? `${raw}T00:00:00Z` : raw);
  if (!Number.isFinite(parsed)) return null;
  return raw;
}

export async function GET() {
  const gate = await requireFounder();
  if ("error" in gate) return gate.error;
  const bundle = await fetchRevenueCommandCenter(gate.session.workspaceId);
  return NextResponse.json(bundle, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const gate = await requireFounder();
  if ("error" in gate) return gate.error;
  const { session, supabase } = gate;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const kind = text(body.kind, 40);

  if (kind === "deal") {
    const company = text(body.companyName, 120);
    const amount = money(body.amount);
    const stream = text(body.revenueStream, 40);
    const stage = text(body.stage, 40) || "prospect";
    if (!company) return NextResponse.json({ message: "Company is required." }, { status: 400 });
    if (amount == null || amount < 0) {
      return NextResponse.json({ message: "Amount must be zero or more." }, { status: 400 });
    }
    if (!STREAM_KEYS.has(stream as never)) {
      return NextResponse.json({ message: "Unknown revenue stream." }, { status: 400 });
    }
    if (!STAGE_KEYS.has(stage as never)) {
      return NextResponse.json({ message: "Unknown stage." }, { status: 400 });
    }

    const isWon = stage === "won";
    const { data, error } = await supabase
      .from("hq_deals")
      .insert({
        workspace_id: session.workspaceId,
        company_name: company,
        opportunity: text(body.opportunity, 160) || null,
        revenue_stream: stream,
        // Scope follows the stream so personal creator revenue can never be
        // filed as INTERTEXE company revenue by mistake.
        scope: scopeOfStream(stream),
        amount,
        stage,
        expected_close_date: isoDateOrNull(body.expectedCloseDate),
        booked_at: isWon ? isoDateOrNull(body.bookedAt) || new Date().toISOString() : null,
        next_action: text(body.nextAction, 200) || null,
        next_action_at: isoDateOrNull(body.nextActionAt),
        notes: text(body.notes, 500) || null,
        entry_mode: "manual",
      })
      .select("id")
      .maybeSingle();
    if (error) return failed(error.message);
    return NextResponse.json({ ok: true, id: data?.id });
  }

  if (kind === "payment") {
    const amount = money(body.amount);
    if (amount == null || amount === 0) {
      return NextResponse.json({ message: "Payment amount is required." }, { status: 400 });
    }
    const refund = body.kind === "refund" || amount < 0;
    const dealId = text(body.dealId, 60) || null;
    const stream = text(body.revenueStream, 40);
    const { error } = await supabase.from("hq_deal_payments").insert({
      workspace_id: session.workspaceId,
      deal_id: dealId,
      scope: STREAM_KEYS.has(stream as never) ? scopeOfStream(stream) : "company",
      revenue_stream: STREAM_KEYS.has(stream as never) ? stream : null,
      amount: refund ? -Math.abs(amount) : Math.abs(amount),
      kind: refund ? "refund" : "payment",
      status: body.status === "pending" || body.status === "failed" ? body.status : "cleared",
      paid_at: isoDateOrNull(body.paidAt) || new Date().toISOString(),
      invoice_reference: text(body.invoiceReference, 80) || null,
      method: text(body.method, 60) || null,
      notes: text(body.notes, 300) || null,
      entry_mode: "manual",
    });
    if (error) return failed(error.message);
    return NextResponse.json({ ok: true });
  }

  if (kind === "activity") {
    const activityType = text(body.activityType, 40);
    if (!ACTIVITY_TYPES.has(activityType)) {
      return NextResponse.json({ message: "Unknown activity type." }, { status: 400 });
    }
    const { error } = await supabase.from("hq_revenue_activities").insert({
      workspace_id: session.workspaceId,
      deal_id: text(body.dealId, 60) || null,
      activity_type: activityType,
      completed_at: isoDateOrNull(body.completedAt) || new Date().toISOString(),
      notes: text(body.notes, 300) || null,
      entry_mode: "manual",
    });
    if (error) return failed(error.message);
    return NextResponse.json({ ok: true });
  }

  if (kind === "confirmation") {
    const checkKey = text(body.checkKey, 60);
    if (!checkKey) return NextResponse.json({ message: "checkKey is required." }, { status: 400 });
    const confirmed = Boolean(body.confirmed);
    const { error } = await supabase.from("hq_founder_confirmations").upsert(
      {
        workspace_id: session.workspaceId,
        check_key: checkKey,
        confirmed,
        confirmed_at: confirmed ? new Date().toISOString() : null,
        confirmed_by: session.email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,check_key" }
    );
    if (error) return failed(error.message);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: "Unknown record type." }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireFounder();
  if ("error" in gate) return gate.error;
  const { session, supabase } = gate;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const kind = text(body.kind, 40);

  if (kind === "deal") {
    const id = text(body.id, 60);
    if (!id) return NextResponse.json({ message: "Deal id is required." }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.amount !== undefined) {
      const amount = money(body.amount);
      if (amount == null || amount < 0) {
        return NextResponse.json({ message: "Amount must be zero or more." }, { status: 400 });
      }
      patch.amount = amount;
    }
    if (body.stage !== undefined) {
      const stage = text(body.stage, 40);
      if (!STAGE_KEYS.has(stage as never)) {
        return NextResponse.json({ message: "Unknown stage." }, { status: 400 });
      }
      patch.stage = stage;
      if (stage === "won") {
        patch.booked_at = isoDateOrNull(body.bookedAt) || new Date().toISOString();
      }
      if (stage === "lost") {
        patch.closed_at = new Date().toISOString();
        patch.booked_at = null;
      }
    }
    if (body.probability !== undefined) {
      if (body.probability === null || body.probability === "") {
        patch.probability_override = null;
      } else {
        const p = Number(body.probability);
        if (!Number.isFinite(p) || p < 0 || p > 1) {
          return NextResponse.json({ message: "Probability must be between 0 and 1." }, { status: 400 });
        }
        patch.probability_override = Math.round(p * 100) / 100;
      }
    }
    if (body.expectedCloseDate !== undefined) patch.expected_close_date = isoDateOrNull(body.expectedCloseDate);
    if (body.nextAction !== undefined) patch.next_action = text(body.nextAction, 200) || null;
    if (body.nextActionAt !== undefined) patch.next_action_at = isoDateOrNull(body.nextActionAt);

    const { error } = await supabase
      .from("hq_deals")
      .update(patch)
      .eq("id", id)
      .eq("workspace_id", session.workspaceId);
    if (error) return failed(error.message);
    return NextResponse.json({ ok: true });
  }

  if (kind === "target") {
    const metric = text(body.metric, 60);
    const targetDate = isoDateOrNull(body.targetDate);
    const value = money(body.targetValue);
    if (!metric || !targetDate || value == null) {
      return NextResponse.json({ message: "metric, targetDate and targetValue are required." }, { status: 400 });
    }
    const stream = text(body.revenueStream, 40);
    const { error } = await supabase.from("hq_revenue_targets").upsert(
      {
        workspace_id: session.workspaceId,
        name: text(body.name, 120) || metric,
        scope: body.scope === "company" || body.scope === "personal" ? body.scope : "combined",
        metric,
        target_value: value,
        target_date: targetDate,
        revenue_stream: STREAM_KEYS.has(stream as never) ? stream : null,
        unit_target: Number.isFinite(Number(body.unitTarget)) ? Number(body.unitTarget) : null,
        notes: text(body.notes, 300) || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,metric,scope,target_date,revenue_stream" }
    );
    if (error) return failed(error.message);
    return NextResponse.json({ ok: true });
  }

  if (kind === "stage_probability") {
    const stage = text(body.stage, 40);
    const p = Number(body.probability);
    if (!STAGE_KEYS.has(stage as never)) {
      return NextResponse.json({ message: "Unknown stage." }, { status: 400 });
    }
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      return NextResponse.json({ message: "Probability must be between 0 and 1." }, { status: 400 });
    }
    const { error } = await supabase
      .from("hq_deal_stages")
      .update({ probability: Math.round(p * 100) / 100 })
      .eq("key", stage);
    if (error) return failed(error.message);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: "Unknown record type." }, { status: 400 });
}
