/**
 * Live B2B wire: brand outreach and /platform requests become $5,000 Pilot
 * opportunities on the founder command center.
 *
 * Never marks a deal won and never sends email. Booked revenue still requires
 * a founder to mark the opportunity won (and cash still requires a payment).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { HQ_WORKSPACE_SLUG } from "./constants";
import { normalizeEmail } from "../email-constants";

export const PILOT_AMOUNT_USD = 5000;
export const PILOT_STREAM = "api_pilot";
export const PILOT_OPPORTUNITY = "Founding Material Data Pilot";

export const B2B_BUYER_TYPES = new Set(["brand", "business", "organization"]);

const STAGE_RANK: Record<string, number> = {
  lost: 0,
  prospect: 10,
  qualified: 20,
  snapshot_sent: 30,
  meeting: 40,
  proposal: 50,
  verbal: 60,
  won: 70,
};

export type PilotLeadIntent = "snapshot" | "founding_pilot" | "api_access" | string;

export type PilotStagePlan = {
  stage: "qualified" | "snapshot_sent" | "meeting" | "proposal";
  amount: number;
  opportunity: string;
  nextAction: string;
  activityType: "qualified_account" | "snapshot_sent" | "personalized_outreach" | "meeting" | "proposal";
  source: string;
};

export function isB2bPilotBuyer(contactType: string | null | undefined): boolean {
  return B2B_BUYER_TYPES.has(String(contactType || "").toLowerCase());
}

export function rankStage(stage: string | null | undefined): number {
  return STAGE_RANK[String(stage || "")] ?? 0;
}

/** System automation never closes a deal as won or lost. */
export function canSystemAdvance(from: string | null | undefined, to: string): boolean {
  if (to === "won" || to === "lost") return false;
  const current = String(from || "");
  if (current === "won" || current === "lost") return false;
  if (!current) return true;
  return rankStage(to) > rankStage(current);
}

export function stageForPlatformIntent(intent: PilotLeadIntent): PilotStagePlan | null {
  if (intent === "founding_pilot") {
    return {
      stage: "proposal",
      amount: PILOT_AMOUNT_USD,
      opportunity: PILOT_OPPORTUNITY,
      nextAction: "Send the $5,000 Founding Material Data Pilot SOW and sample deliverable.",
      activityType: "proposal",
      source: "platform_founding_pilot",
    };
  }
  if (intent === "snapshot") {
    return {
      stage: "snapshot_sent",
      amount: PILOT_AMOUNT_USD,
      opportunity: `${PILOT_OPPORTUNITY} (from snapshot request)`,
      nextAction: "Deliver the 10-product snapshot and invite them to the $5,000 founding pilot.",
      activityType: "snapshot_sent",
      source: "platform_snapshot",
    };
  }
  return null;
}

export function stageFromGmailEvent(
  eventType: string,
  currentStage: string | null | undefined
): { stage: "qualified" | "meeting"; activityType: "personalized_outreach" | "meeting"; nextAction: string } | null {
  if (eventType === "email_sent" || eventType === "follow_up_sent") {
    const stage = "qualified" as const;
    if (currentStage && !canSystemAdvance(currentStage, stage)) return null;
    return {
      stage,
      activityType: "personalized_outreach",
      nextAction: "Follow up on the Founding Material Data Pilot and offer a 10-product snapshot.",
    };
  }
  if (eventType === "email_reply_received") {
    const stage = "meeting" as const;
    if (currentStage && !canSystemAdvance(currentStage, stage)) return null;
    return {
      stage,
      activityType: "meeting",
      nextAction: "Book a meeting and send the $5,000 pilot SOW.",
    };
  }
  return null;
}

function looksMissing(message: string | undefined): boolean {
  return Boolean(message && /does not exist|schema cache|could not find/i.test(message));
}

async function hqWorkspaceId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from("hq_workspaces")
    .select("id")
    .eq("slug", HQ_WORKSPACE_SLUG)
    .maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

async function upsertBrandContact(
  supabase: SupabaseClient,
  workspaceId: string,
  input: {
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    intent: string;
  }
): Promise<string | null> {
  const email = normalizeEmail(input.email);
  const { data: existing } = await supabase
    .from("hq_contacts")
    .select("id, contact_type")
    .eq("workspace_id", workspaceId)
    .eq("normalized_email", email)
    .maybeSingle();

  const fullName = `${input.firstName} ${input.lastName}`.trim();
  if (existing?.id) {
    const type = String(existing.contact_type || "");
    const patch: Record<string, unknown> = {
      relationship_status: "engaged",
      company_name: input.company,
      updated_at: new Date().toISOString(),
    };
    if (!isB2bPilotBuyer(type)) patch.contact_type = "brand";
    await supabase.from("hq_contacts").update(patch).eq("id", existing.id);
    return String(existing.id);
  }

  const { data, error } = await supabase
    .from("hq_contacts")
    .insert({
      workspace_id: workspaceId,
      email,
      normalized_email: email,
      first_name: input.firstName,
      last_name: input.lastName,
      full_name: fullName || null,
      name: fullName || input.company,
      company_name: input.company,
      contact_type: "brand",
      outreach_status: "not_contacted",
      relationship_status: "engaged",
      source: "inbound",
      campaign: input.intent,
      notes: `Inbound /platform ${input.intent} request.`,
    })
    .select("id")
    .maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

type OpenDeal = {
  id: string;
  stage: string;
  amount: number;
  contact_id: string | null;
};

async function findPilotDeal(
  supabase: SupabaseClient,
  workspaceId: string,
  contactId: string | null,
  company: string
): Promise<{ open: OpenDeal | null; alreadyWon: boolean; tableMissing: boolean }> {
  let q = supabase
    .from("hq_deals")
    .select("id, stage, amount, contact_id")
    .eq("workspace_id", workspaceId)
    .eq("revenue_stream", PILOT_STREAM)
    .limit(50);
  if (contactId) q = q.eq("contact_id", contactId);
  else q = q.ilike("company_name", company);

  const { data, error } = await q;
  if (error) {
    return { open: null, alreadyWon: false, tableMissing: looksMissing(error.message) };
  }
  const rows = (data || []) as OpenDeal[];
  if (rows.some((row) => row.stage === "won")) {
    return { open: null, alreadyWon: true, tableMissing: false };
  }
  const open = rows.find((row) => row.stage !== "lost") || null;
  return { open, alreadyWon: false, tableMissing: false };
}

async function recordActivity(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    dealId: string | null;
    contactId: string | null;
    activityType: string;
    notes: string;
    at?: string;
  }
) {
  const { error } = await supabase.from("hq_revenue_activities").insert({
    workspace_id: input.workspaceId,
    deal_id: input.dealId,
    contact_id: input.contactId,
    activity_type: input.activityType,
    completed_at: input.at || new Date().toISOString(),
    notes: input.notes,
    entry_mode: "system",
  });
  return !error || looksMissing(error.message);
}

export type MotherboardSyncResult = {
  ok: boolean;
  createdDeal: boolean;
  advancedDeal: boolean;
  skipped?: string;
};

async function writePilotDeal(
  supabase: SupabaseClient,
  workspaceId: string,
  input: {
    contactId: string | null;
    company: string;
    stage: string;
    amount: number;
    opportunity: string;
    nextAction: string;
    source: string;
    activityType: string;
    notes: string;
    at?: string;
  }
): Promise<MotherboardSyncResult> {
  const found = await findPilotDeal(supabase, workspaceId, input.contactId, input.company);
  if (found.tableMissing) return { ok: false, createdDeal: false, advancedDeal: false, skipped: "tables_missing" };
  if (found.alreadyWon) return { ok: true, createdDeal: false, advancedDeal: false, skipped: "already_won" };

  if (found.open) {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      next_action: input.nextAction,
    };
    if (input.contactId && !found.open.contact_id) patch.contact_id = input.contactId;
    let advanced = false;
    if (canSystemAdvance(found.open.stage, input.stage)) {
      patch.stage = input.stage;
      advanced = true;
    }
    const { error } = await supabase.from("hq_deals").update(patch).eq("id", found.open.id);
    if (error) return { ok: false, createdDeal: false, advancedDeal: false, skipped: error.message };
    await recordActivity(supabase, {
      workspaceId,
      dealId: found.open.id,
      contactId: input.contactId,
      activityType: input.activityType,
      notes: input.notes,
      at: input.at,
    });
    return { ok: true, createdDeal: false, advancedDeal: advanced };
  }

  const { data, error } = await supabase
    .from("hq_deals")
    .insert({
      workspace_id: workspaceId,
      company_name: input.company,
      opportunity: input.opportunity,
      contact_id: input.contactId,
      revenue_stream: PILOT_STREAM,
      scope: "company",
      amount: input.amount,
      currency: "USD",
      stage: input.stage,
      expected_close_date: "2026-12-31",
      next_action: input.nextAction,
      source: input.source,
      notes: input.notes,
      entry_mode: "system",
    })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, createdDeal: false, advancedDeal: false, skipped: error.message };

  await recordActivity(supabase, {
    workspaceId,
    dealId: data?.id ? String(data.id) : null,
    contactId: input.contactId,
    activityType: input.activityType,
    notes: input.notes,
    at: input.at,
  });
  return { ok: true, createdDeal: true, advancedDeal: false };
}

export async function syncPlatformLeadToPilotPipeline(
  supabase: SupabaseClient,
  lead: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    intent: string;
  }
): Promise<MotherboardSyncResult> {
  const plan = stageForPlatformIntent(lead.intent);
  if (!plan) return { ok: true, createdDeal: false, advancedDeal: false, skipped: "not_a_pilot_intent" };

  try {
    const workspaceId = await hqWorkspaceId(supabase);
    if (!workspaceId) return { ok: false, createdDeal: false, advancedDeal: false, skipped: "no_workspace" };

    const contactId = await upsertBrandContact(supabase, workspaceId, {
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company,
      intent: lead.intent,
    });

    return writePilotDeal(supabase, workspaceId, {
      contactId,
      company: lead.company,
      stage: plan.stage,
      amount: plan.amount,
      opportunity: plan.opportunity,
      nextAction: plan.nextAction,
      source: plan.source,
      activityType: plan.activityType,
      notes: `Opened from /platform ${lead.intent} request.`,
    });
  } catch {
    return { ok: false, createdDeal: false, advancedDeal: false, skipped: "sync_failed" };
  }
}

export async function syncGmailEventToPilotPipeline(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    contactId: string;
    contactType: string | null | undefined;
    companyName: string | null | undefined;
    email: string;
    eventType: string;
    at?: string;
  }
): Promise<MotherboardSyncResult> {
  if (!isB2bPilotBuyer(input.contactType)) {
    return { ok: true, createdDeal: false, advancedDeal: false, skipped: "not_a_b2b_buyer" };
  }

  const company = String(input.companyName || "").trim() || input.email;
  const found = await findPilotDeal(supabase, input.workspaceId, input.contactId, company);
  if (found.tableMissing) return { ok: false, createdDeal: false, advancedDeal: false, skipped: "tables_missing" };
  if (found.alreadyWon) return { ok: true, createdDeal: false, advancedDeal: false, skipped: "already_won" };

  const move = stageFromGmailEvent(input.eventType, found.open?.stage || null);
  if (!move && found.open) {
    if (input.eventType === "email_sent" || input.eventType === "follow_up_sent") {
      await recordActivity(supabase, {
        workspaceId: input.workspaceId,
        dealId: found.open.id,
        contactId: input.contactId,
        activityType: "personalized_outreach",
        notes: `Gmail ${input.eventType} with ${input.email}.`,
        at: input.at,
      });
    }
    return { ok: true, createdDeal: false, advancedDeal: false, skipped: "stage_unchanged" };
  }
  const stage = move?.stage || "qualified";
  const activityType = move?.activityType || "personalized_outreach";
  const nextAction =
    move?.nextAction || "Follow up on the Founding Material Data Pilot and offer a 10-product snapshot.";

  try {
    return writePilotDeal(supabase, input.workspaceId, {
      contactId: input.contactId,
      company,
      stage,
      amount: PILOT_AMOUNT_USD,
      opportunity: PILOT_OPPORTUNITY,
      nextAction,
      source: "gmail_brand_outreach",
      activityType,
      notes: `Gmail ${input.eventType} with ${input.email}.`,
      at: input.at,
    });
  } catch {
    return { ok: false, createdDeal: false, advancedDeal: false, skipped: "sync_failed" };
  }
}
