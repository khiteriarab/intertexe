import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCustomerEmail } from "../resend-customer";
import { EMAIL_TYPES } from "../email-constants";

export type NotificationCategory =
  | "issue_assigned"
  | "import_failed"
  | "import_completed"
  | "approval_requested"
  | "approval_decided"
  | "passport_ready"
  | "passport_published"
  | "integration_error"
  | "supplier_evidence"
  | "general";

const CATEGORY_PREF_MAP: Record<NotificationCategory, string> = {
  issue_assigned: "issues",
  import_failed: "imports",
  import_completed: "imports",
  approval_requested: "approvals",
  approval_decided: "approvals",
  passport_ready: "passports",
  passport_published: "passports",
  integration_error: "integrations",
  supplier_evidence: "suppliers",
  general: "general",
};

export async function emitEnterpriseNotification(input: {
  client: SupabaseClient;
  organizationId: string;
  recipientId: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  href?: string;
  metadata?: Record<string, unknown>;
  emailSubject?: string;
}): Promise<void> {
  const prefCategory = CATEGORY_PREF_MAP[input.category];
  const { data: pref } = await input.client
    .from("notification_preferences")
    .select("in_app, email")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.recipientId)
    .eq("category", prefCategory)
    .maybeSingle();

  const inApp = pref?.in_app !== false;
  const email = pref?.email === true;

  if (inApp) {
    await input.client.from("enterprise_notifications").insert({
      organization_id: input.organizationId,
      recipient_id: input.recipientId,
      category: input.category,
      title: input.title,
      body: input.body || null,
      href: input.href || null,
      metadata: input.metadata || {},
    });
  }

  if (email) {
    const { data: profile } = await input.client
      .from("profiles")
      .select("email")
      .eq("id", input.recipientId)
      .maybeSingle();
    if (profile?.email) {
      const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://platform.intertexe.com").replace(/\/$/, "");
      const link = input.href ? `${origin}${input.href.startsWith("/") ? input.href : `/${input.href}`}` : origin;
      await sendCustomerEmail({
        to: profile.email,
        subject: input.emailSubject || input.title,
        html: `<p>${input.title}</p>${input.body ? `<p>${input.body}</p>` : ""}<p><a href="${link}">Open in INTERTEXE</a></p>`,
        emailType: EMAIL_TYPES.ENTERPRISE_NOTIFICATION,
        metadata: { organizationId: input.organizationId, category: input.category },
      });
      await input.client
        .from("enterprise_notifications")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("organization_id", input.organizationId)
        .eq("recipient_id", input.recipientId)
        .eq("title", input.title)
        .is("email_sent_at", null);
    }
  }
}

export async function listNotifications(
  client: SupabaseClient,
  organizationId: string,
  recipientId: string,
  limit = 50
) {
  const { data } = await client
    .from("enterprise_notifications")
    .select("id, category, title, body, href, read_at, created_at")
    .eq("organization_id", organizationId)
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function unreadNotificationCount(
  client: SupabaseClient,
  organizationId: string,
  recipientId: string
): Promise<number> {
  const { count } = await client
    .from("enterprise_notifications")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("recipient_id", recipientId)
    .is("read_at", null);
  return count || 0;
}

export async function markNotificationsRead(
  client: SupabaseClient,
  organizationId: string,
  recipientId: string,
  ids?: string[]
) {
  let query = client
    .from("enterprise_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("recipient_id", recipientId)
    .is("read_at", null);
  if (ids?.length) query = query.in("id", ids);
  await query;
}
