import { NextRequest, NextResponse } from "next/server";
import { requireHqSession } from "../../../../../../../lib/dashboard/auth";
import { getEnterpriseServiceClient } from "../../../../../../../lib/enterprise/client";
import { writeHqEnterprisePointers } from "../../../../../../../lib/enterprise/hq-refs";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireHqSession({ roles: ["founder"] });
  const { id } = await context.params;
  const supabase = getEnterpriseServiceClient();
  if (!supabase) {
    return NextResponse.json({ message: "Enterprise database is not linked." }, { status: 503 });
  }
  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, plan, kind, hq_deal_id")
    .eq("id", id)
    .maybeSingle();
  if (!org) return NextResponse.json({ message: "Organization not found." }, { status: 404 });

  const { error } = await supabase
    .from("organizations")
    .update({
      plan: "founding_pilot",
      kind: "pilot",
      account_state: "converted",
      snapshot_stage: "converted",
      product_allowance: 500,
      passport_allowance: 100,
      entitlements: { product_limit: 500, founding_pilot: true },
    })
    .eq("id", org.id);
  if (error) return NextResponse.json({ message: "Upgrade failed." }, { status: 500 });

  await supabase.from("audit_logs").insert({
    organization_id: org.id,
    action: "converted_to_founding_pilot",
    object_type: "organization",
    object_id: org.id,
    previous_ref: org.plan,
    resulting_ref: "founding_pilot",
    request_meta: { actor_email: session.email },
  });

  await writeHqEnterprisePointers({
    hqDealId: org.hq_deal_id ? String(org.hq_deal_id) : null,
    organizationId: org.id,
    slug: org.slug,
    pilotStatus: "founding_pilot",
    implementationStatus: "converted",
  });

  return NextResponse.json({ ok: true, slug: org.slug, plan: "founding_pilot" });
}
