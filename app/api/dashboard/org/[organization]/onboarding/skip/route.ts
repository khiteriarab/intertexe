import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireOrganizationAccess } from "../../../../../../../lib/enterprise/access";
import { onboardingSkipCookieName } from "../../../../../../../lib/enterprise/getting-started";

export async function POST(
  _request: Request,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  await requireOrganizationAccess(organization);

  const cookieStore = await cookies();
  cookieStore.set(onboardingSkipCookieName(organization), "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  return NextResponse.json({ ok: true });
}
