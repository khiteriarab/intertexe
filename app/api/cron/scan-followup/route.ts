export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { Resend } from "resend";
import ScanFollowUpEmail from "@/emails/ScanFollowUpEmail";
import { authorizeCron } from "@/lib/cron-auth";
import { EMAIL_FROM } from "@/lib/email-constants";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
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

  const resend = new Resend(apiKey);

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

    await resend.emails.send({
      from: EMAIL_FROM,
      to: item.email,
      subject: "Your scan result from Intertexe",
      html: emailHtml,
    });

    await supabase.from("scan_follow_up_queue").update({ sent: true }).eq("id", item.id);
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({ sent: pending.length });
}
