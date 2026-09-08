import { NextResponse } from "next/server";
import { requireHqSession } from "../../../../../lib/dashboard/auth";
import { getEnterpriseServiceClient } from "../../../../../lib/enterprise/client";
import { loadHqBillingOverview } from "../../../../../lib/enterprise/billing-hq";

export const dynamic = "force-dynamic";

/** Founder HQ — orgs at limit, unpaid publish, MRR estimate. */
export async function GET() {
  const session = await requireHqSession({ roles: ["founder"] });
  void session;

  const client = getEnterpriseServiceClient();
  if (!client) {
    return NextResponse.json({ message: "Enterprise DB unavailable" }, { status: 503 });
  }

  const overview = await loadHqBillingOverview(client);
  return NextResponse.json(overview);
}
