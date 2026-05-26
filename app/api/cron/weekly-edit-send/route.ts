export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { Resend } from "resend";
import WeeklyEditEmail from "@/emails/WeeklyEditEmail";
import { authorizeCron, getWeekNumber } from "@/lib/cron-auth";
import { EMAIL_FROM } from "@/lib/email-constants";
import { createServiceClient } from "@/lib/supabase/server";
import { listMarketingSubscriberEmails } from "@/lib/weekly-edit";

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
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

    const subscribers = await listMarketingSubscriberEmails(supabase);
    if (subscribers.length === 0) {
      return NextResponse.json({ error: "No subscribers found" }, { status: 500 });
    }

    const emailHtml = await render(
      WeeklyEditEmail({
        weekNumber,
        collectionName: queuedEdit.collection_name,
        collectionUrl: queuedEdit.collection_url,
        collectionSubline: queuedEdit.collection_subline,
        fiberFact: queuedEdit.fiber_fact,
        fiberFactFiber: queuedEdit.fiber_fact_fiber,
        products: queuedEdit.products,
        isPreview: false,
      })
    );

    const resend = new Resend(apiKey);
    const batchSize = 100;
    let sent = 0;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      await resend.batch.send(
        batch.map((to) => ({
          from: EMAIL_FROM,
          to,
          subject: `The Intertexe Edit — ${queuedEdit.collection_name} and eight verified pieces`,
          html: emailHtml,
        }))
      );
      sent += batch.length;
      await new Promise((r) => setTimeout(r, 500));
    }

    await supabase
      .from("weekly_edit_queue")
      .update({ status: "sent", sent_at: new Date().toISOString(), sent_count: sent })
      .eq("week_number", weekNumber);

    return NextResponse.json({ success: true, sent });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Weekly edit send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
