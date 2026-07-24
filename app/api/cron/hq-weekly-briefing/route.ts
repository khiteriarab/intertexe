import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import {
  buildExecutiveBriefing,
  buildRuleInsights,
} from "../../../../lib/dashboard/insights";
import { fetchHqOverviewMetrics, fetchHqCommercePage } from "../../../../lib/dashboard/metrics";

export const dynamic = "force-dynamic";

/**
 * Weekly founder briefing email.
 * Secure with Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const { data: workspace } = await supabase
    .from("hq_workspaces")
    .select("id, name, slug")
    .eq("slug", "intertexe")
    .maybeSingle();
  if (!workspace) return NextResponse.json({ message: "Workspace missing" }, { status: 404 });

  const metrics = await fetchHqOverviewMetrics();
  const commerce = await fetchHqCommercePage(workspace.id);
  const insights = buildRuleInsights(metrics);
  const lines = buildExecutiveBriefing("Khiteri", metrics, insights);
  if (commerce.revenueConnected) {
    lines.push(
      `Revenue 7d — commission $${Number(commerce.commission7d || 0).toFixed(0)}, sales $${Number(commerce.sales7d || 0).toFixed(0)}.`
    );
  } else {
    lines.push("Revenue still not connected — import Rakuten transactions in Dashboard → Commerce.");
  }

  const to = process.env.HQ_WEEKLY_REPORT_EMAIL || "info@intertexe.com";
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ message: "RESEND_API_KEY missing", preview: lines }, { status: 503 });
  }

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <p style="letter-spacing:0.2em;font-size:11px;text-transform:uppercase;color:#888">INTERTEXE Dashboard</p>
      <h1 style="font-weight:500;font-size:28px">Weekly briefing</h1>
      ${lines.map((l) => `<p style="line-height:1.5">${l}</p>`).join("")}
      <p style="margin-top:28px"><a href="https://www.intertexe.com/dashboard">Open Dashboard →</a></p>
    </div>
  `;

  const send = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Intertexe <info@mail.intertexe.com>",
      to: [to],
      subject: "INTERTEXE weekly briefing",
      html,
    }),
  });

  if (!send.ok) {
    const text = await send.text();
    return NextResponse.json({ message: text.slice(0, 400) }, { status: 502 });
  }

  return NextResponse.json({ ok: true, to, lines });
}
