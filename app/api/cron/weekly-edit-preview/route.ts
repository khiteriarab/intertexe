export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { Resend } from "resend";
import WeeklyEditEmail from "@/emails/WeeklyEditEmail";
import { authorizeCron, getWeekNumber } from "@/lib/cron-auth";
import { EMAIL_FROM } from "@/lib/email-constants";
import { createServiceClient } from "@/lib/supabase/server";
import { getWeeklyEditMeta, selectWeeklyEditProducts } from "@/lib/weekly-edit";

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const previewEmail = process.env.WEEKLY_EDIT_PREVIEW_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!previewEmail || !apiKey) {
    return NextResponse.json(
      { error: "Missing WEEKLY_EDIT_PREVIEW_EMAIL or RESEND_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const supabase = createServiceClient();
    const weekNumber = getWeekNumber();
    const emailProducts = await selectWeeklyEditProducts(supabase, weekNumber);
    const { fiberFact, collection } = getWeeklyEditMeta(weekNumber);

    const previewHtml = await render(
      WeeklyEditEmail({
        weekNumber,
        collectionName: collection.name,
        collectionUrl: collection.url,
        collectionSubline: collection.subline,
        fiberFact: fiberFact.fact,
        fiberFactFiber: fiberFact.fiber,
        products: emailProducts,
        isPreview: true,
      })
    );

    await supabase.from("weekly_edit_queue").upsert(
      {
        week_number: weekNumber,
        products: emailProducts,
        collection_name: collection.name,
        collection_url: collection.url,
        collection_subline: collection.subline,
        fiber_fact: fiberFact.fact,
        fiber_fact_fiber: fiberFact.fiber,
        status: "pending_review",
        created_at: new Date().toISOString(),
      },
      { onConflict: "week_number" }
    );

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: EMAIL_FROM,
      to: previewEmail,
      subject: `[PREVIEW] Friday Edit — Week ${weekNumber} — Approve by midnight`,
      html: previewHtml,
    });

    return NextResponse.json({
      success: true,
      weekNumber,
      productsSelected: emailProducts.length,
      collection: collection.name,
      fiberFact: fiberFact.fiber,
      previewSentTo: previewEmail,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Weekly edit preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
