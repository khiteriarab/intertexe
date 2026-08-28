import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import { createSupplierEvidenceRequest } from "../../../../../../../lib/enterprise/supplier-evidence";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string; id: string }> }
) {
  const { organization, id } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;

  const body = await request.json();
  const supplierName = String(body.supplierName || "").trim();
  if (!supplierName) {
    return NextResponse.json({ message: "Supplier name is required." }, { status: 400 });
  }

  const { data: profile } = await gate.access.client.from("profiles").select("id").maybeSingle();

  try {
    const result = await createSupplierEvidenceRequest({
      client: gate.access.client,
      organizationId: gate.access.membership.organizationId,
      issueId: id,
      requesterId: profile?.id || null,
      supplierName,
      supplierEmail: body.supplierEmail,
      dueAt: body.dueAt,
      notes: body.notes,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Supplier request failed." },
      { status: 400 }
    );
  }
}
