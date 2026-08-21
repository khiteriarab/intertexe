export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import WeeklyEditEmail from "@/emails/WeeklyEditEmail";
import { authorizeCron, getWeekNumber } from "@/lib/cron-auth";
import { EMAIL_FROM, EMAIL_REPLY_TO, EMAIL_TYPES } from "@/lib/email-constants";
import { sendCustomerEmailBatch } from "@/lib/resend-customer";
import { createServiceClient } from "@/lib/supabase/server";
import { getWeeklyEditMeta, listMarketingSubscriberEmails, selectWeeklyEditProducts } from "@/lib/weekly-edit";

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  try {
    const supabase = createServiceClient();
    const weekNumber = getWeekNumber();

    const { data: queuedEdit, error: queueError } = await supabase
      .from("weekly_edit_queue")
      .select("*")
      .eq("week_number", weekNumber)
      .eq("status", "pending_review")
      .single();

    if (queueError || !queuedEdit) {
      return NextResponse.json(
        { error: "No queued edit found or already sent" },
        { status: 404 }
      );
    }

    // Honors user_preferences.marketing_emails / unsubscribed_at.
    const subscribers = await listMarketingSubscriberEmails(supabase);
    if (subscribers.length === 0) {
      return NextResponse.json({ error: "No subscribers found" }, { status: 500 });
    }

    // Gate on Thursday preview, but rebuild products + copy so Friday
    // does not send a stale random catalog (e.g. the Loewe poplin shirt).
    const emailProducts = await selectWeeklyEditProducts(supabase, weekNumber);
    const { fiberFact, collection } = getWeeklyEditMeta(weekNumber, emailProducts);

    const emailHtml = await render(
      WeeklyEditEmail({
        weekNumber,
        collectionName: collection.name,
        collectionUrl: collection.url,
        collectionSubline: collection.subline,
        collectionImageUrl: collection.imageUrl,
        fiberFact: fiberFact.fact,
        fiberFactFiber: fiberFact.fiber,
        fiberFactHeadline: fiberFact.headline,
        fiberFactTraits: [...fiberFact.traits],
        products: emailProducts,
        isPreview: false,
      })
    );

    const subject = `The Weekly Edit — ${collection.name}`;
    const batchSize = 100;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      const result = await sendCustomerEmailBatch(
        batch.map((to) => ({
          to,
          subject,
          html: emailHtml,
          emailType: EMAIL_TYPES.WEEKLY_EDIT,
          from: EMAIL_FROM,
          replyTo: EMAIL_REPLY_TO,
          metadata: {
            week_number: weekNumber,
            classification: "marketing",
          },
        }))
      );
      sent += result.sent;
      failed += result.failed;
      await new Promise((r) => setTimeout(r, 500));
    }

    await supabase
      .from("weekly_edit_queue")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_count: sent,
        products: emailProducts,
        collection_name: collection.name,
        collection_url: collection.url,
        collection_subline: collection.subline,
        fiber_fact: fiberFact.fact,
        fiber_fact_fiber: fiberFact.fiber,
      })
      .eq("week_number", weekNumber);

    return NextResponse.json({ success: true, sent, failed });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Weekly edit send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
