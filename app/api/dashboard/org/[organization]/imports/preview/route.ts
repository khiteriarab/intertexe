import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import { parseImportPayload } from "../../../../../../../lib/enterprise/csv";
import { loadExistingMatchKeys } from "../../../../../../../lib/enterprise/pipeline";
import { previewImportWithCatalog, suggestColumnMapping } from "../../../../../../../lib/enterprise/import-preview";

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
  if (!parsed.rows.length) {
    return NextResponse.json({ message: "No rows detected." }, { status: 400 });
  }
  if (parsed.rows.length > 500) {
    return NextResponse.json({ message: "Phase 1 imports are limited to 500 rows per file." }, { status: 400 });
  }
  const suggested = suggestColumnMapping(parsed.columns);
  const mapping = (body.mapping as Record<string, string> | undefined) ||
    Object.fromEntries(suggested.filter((row) => row.canonicalField).map((row) => [row.sourceColumn, row.canonicalField!]));
  const existing = await loadExistingMatchKeys(gate.access.membership.organizationId);
  const preview = previewImportWithCatalog(parsed.rows, mapping, existing);
  return NextResponse.json({
    columns: parsed.columns,
    rowCount: parsed.rows.length,
    suggested,
    mapping,
    preview,
  });
}
