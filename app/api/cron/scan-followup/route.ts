export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import ScanFollowUpEmail from "@/emails/ScanFollowUpEmail";
import { authorizeCron } from "@/lib/cron-auth";
import { EMAIL_FROM, EMAIL_REPLY_TO, EMAIL_TYPES } from "@/lib/email-constants";
import { sendCustomerEmail } from "@/lib/resend-customer";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  const supabase = createServiceClient();
  const { data: pending, error } = await supabase
    .from("scan_follow_up_queue")
    .select("*")
    .eq("sent", false)
    .lte("send_at", new Date().toISOString())
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pending?.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const item of pending) {
    const emailHtml = await render(
      ScanFollowUpEmail({
        composition: item.composition || "",
        naturalFiberPercent: item.natural_fiber_percent || 0,
        verdict: item.verdict || "",
        alternativesUrl:
          item.alternatives_url || "https://www.intertexe.com/scanner?ref=email",
      })
    );

    const result = await sendCustomerEmail({
      to: item.email,
      subject: "Your scan result from Intertexe",
      html: emailHtml,
      emailType: EMAIL_TYPES.SCAN_FOLLOWUP,
      from: EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      metadata: {
        queue_id: item.id,
        classification: "transactional_followup",
      },
    });

    if (result.ok) {
      await supabase.from("scan_follow_up_queue").update({ sent: true }).eq("id", item.id);
      sent++;
    } else {
      failed++;
      console.error("scan follow-up send failed:", result.error);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({ sent, failed });
}
