import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../../lib/enterprise/api-auth";
import { approveProductFields } from "../../../../../../../../lib/enterprise/review";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string; productId: string }> }
) {
  const { organization, productId } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const body = await request.json().catch(() => ({}));
  try {
    await approveProductFields({
      client: gate.access.client,
      organizationId: gate.access.membership.organizationId,
      productId,
      reason: String(body.reason || ""),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Approve failed." },
      { status: 400 }
    );
  }
}
