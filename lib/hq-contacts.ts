import { normalizeEmail } from "./email-constants";
import { createServiceClient } from "./supabase/server";

export const HQ_CONTACT_TYPES = [
  "customer",
  "influencer",
  "business",
  "press",
  "brand",
  "organization",
  "affiliate_partner",
  "investor",
  "other",
] as const;

export type HqContactType = (typeof HQ_CONTACT_TYPES)[number];

export const HQ_OUTREACH_STATUSES = [
  "not_contacted",
  "contacted",
  "replied",
  "interested",
  "follow_up_due",
  "converted",
  "not_interested",
  "dormant",
] as const;

export type HqOutreachStatus = (typeof HQ_OUTREACH_STATUSES)[number];

const TERMINAL = new Set<HqOutreachStatus>(["not_interested", "dormant"]);
const CONVERTED_LOCK = new Set<HqOutreachStatus>(["converted", "not_interested", "dormant"]);

export function canonicalizeContactType(raw: string | null | undefined): HqContactType {
  const v = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const aliases: Record<string, HqContactType> = {
    customer: "customer",
    customers: "customer",
    potential_customer: "customer",
    potential_customers: "customer",
    influencer: "influencer",
    influencers: "influencer",
    creator: "influencer",
    creators: "influencer",
    business: "business",
    businesses: "business",
    press: "press",
    brand: "brand",
    brands: "brand",
    organization: "organization",
    organisations: "organization",
    affiliate_partner: "affiliate_partner",
    affiliate: "affiliate_partner",
    investor: "investor",
    investors: "investor",
    other: "other",
  };
  return aliases[v] || "other";
}

export function nextStatusForEvent(
  current: string | null | undefined,
  eventType: "email_sent" | "follow_up_sent" | "email_reply_received" | "account_created" | "contact_imported"
): HqOutreachStatus {
  const cur = (HQ_OUTREACH_STATUSES as readonly string[]).includes(String(current))
    ? (current as HqOutreachStatus)
    : "not_contacted";
  if (eventType === "contact_imported") return cur || "not_contacted";
  if (eventType === "account_created") {
    return TERMINAL.has(cur) ? cur : "converted";
  }
  if (eventType === "email_reply_received") {
    return CONVERTED_LOCK.has(cur) ? cur : "replied";
  }
  if (eventType === "email_sent" || eventType === "follow_up_sent") {
    if (CONVERTED_LOCK.has(cur) || cur === "replied" || cur === "interested") return cur;
    return "contacted";
  }
  return cur;
}

/**
 * Outreach contacts live in Supabase `hq_contacts`.
 * HQ does not import or edit them. On signup, match email → set user_id.
 */
export async function linkHqContactOnSignup(input: {
  email: string;
  userId: string;
}): Promise<void> {
  const email = normalizeEmail(input.email || "");
  const userId = (input.userId || "").trim();
  if (!email || !userId) return;

  const supabase = createServiceClient();
  const { data: existing, error: findError } = await supabase
    .from("hq_contacts")
    .select("id, outreach_status, user_id")
    .eq("normalized_email", email)
    .is("user_id", null)
    .limit(20);

  if (findError) {
    const code = String(findError.code || "");
    const message = String(findError.message || "");
    if (
      code === "PGRST205" ||
      /hq_contacts/i.test(message) ||
      /schema cache/i.test(message) ||
      /does not exist/i.test(message)
    ) {
      return;
    }
    return;
  }

  const rows = existing || [];
  if (!rows.length) return;

  for (const row of rows) {
    const next = nextStatusForEvent(row.outreach_status, "account_created");
    await supabase
      .from("hq_contacts")
      .update({
        user_id: userId,
        outreach_status: next,
        account_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    await supabase.from("hq_contact_outreach").insert({
      contact_id: row.id,
      email,
      channel: "system",
      direction: "system",
      provider: "supabase",
      event_type: "account_created",
      metadata: { user_id: userId },
    });
  }
}
