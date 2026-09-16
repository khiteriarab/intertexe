import { NextResponse } from "next/server";
import { getOrganizationAccess, canMutateEnterprise } from "../../../../../../../lib/enterprise/access";
import {
  defaultMassUnitForCountry,
  parseMassUnit,
  saveOrganizationMeasurementPreferences,
} from "../../../../../../../lib/enterprise/org-preferences";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const access = await getOrganizationAccess(organization);
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }
  if (!canMutateEnterprise(access.membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    countryCode?: string;
    preferredMassUnit?: string;
  };
  const countryCode = String(body.countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return NextResponse.json({ error: "Select a valid country." }, { status: 400 });
  }
  const preferredMassUnit = body.preferredMassUnit
    ? parseMassUnit(body.preferredMassUnit)
    : defaultMassUnitForCountry(countryCode);

  try {
    const prefs = await saveOrganizationMeasurementPreferences(
      access.client,
      access.membership.organizationId,
      { countryCode, preferredMassUnit }
    );
    return NextResponse.json({ ok: true, preferences: prefs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save preferences." },
      { status: 500 }
    );
  }
}
