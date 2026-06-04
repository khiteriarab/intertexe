export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import {
  generatePermanentReferralCode,
  getReferralProfile,
  recordReferral,
} from "../../../../lib/invitation-codes";
import { snakeToCamel } from "../../../../lib/case-utils";

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user?.id) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const userId = String(user.supabase_user_id || user.id);
  await generatePermanentReferralCode(userId);
  const profile = await getReferralProfile(userId);
  return NextResponse.json(snakeToCamel(profile));
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user?.id) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const userId = String(user.supabase_user_id || user.id);
  let invitationCode: string | undefined;

  try {
    const body = await request.json();
    invitationCode =
      typeof body?.invitationCode === "string" ? body.invitationCode : undefined;
  } catch {
    invitationCode = undefined;
  }

  const referralCode = await generatePermanentReferralCode(userId);

  if (invitationCode?.trim()) {
    await recordReferral(invitationCode, userId);
  }

  const profile = await getReferralProfile(userId);
  return NextResponse.json(
    snakeToCamel({
      referral_code: profile.referral_code ?? referralCode,
      referral_count: profile.referral_count,
    })
  );
}
