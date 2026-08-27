import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import { parseImportPayload } from "../../../../../../../lib/enterprise/csv";
import { commitMappedImport } from "../../../../../../../lib/enterprise/pipeline";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const body = await request.json();
  const parsed = parseImportPayload({ csv: body.csv, json: body.json });
  const mapping = (body.mapping || {}) as Record<string, string>;
  if (!parsed.rows.length || !Object.keys(mapping).length) {
    return NextResponse.json({ message: "Confirm mapping before importing." }, { status: 400 });
  }
  try {
    const result = await commitMappedImport({
      organizationId: gate.access.membership.organizationId,
      organizationPlan: gate.access.membership.plan,
      productAllowance: gate.access.membership.productAllowance ?? null,
      actorEmail: gate.access.actor.email,
      filename: String(body.filename || "upload.csv"),
      mapping,
      rows: parsed.rows,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Import failed." },
      { status: 400 }
    );
  }
}
