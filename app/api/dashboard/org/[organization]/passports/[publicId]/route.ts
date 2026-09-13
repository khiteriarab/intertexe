import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import { resolvePublicPassport } from "../../../../../../../lib/enterprise/public-resolver";

export const dynamic = "force-dynamic";

/**
 * Brand Product API — full passport structure for white-label apps.
 * GET /api/dashboard/org/{org}/passports/{publicId}
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ organization: string; publicId: string }> }
) {
  const { organization, publicId } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;

  const view = await resolvePublicPassport(publicId);
  if (!view.found || !view.passport) {
    return NextResponse.json({ error: "passport_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    publicId: view.publicId,
    version: view.versionNumber,
    state: view.state,
    passport: view.passport,
  });
}
