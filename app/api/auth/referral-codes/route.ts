export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import {
  generateReferralCodes,
  getUserReferralCodes,
  redeemInvitationCode,
} from "../../../../lib/invitation-codes";
import { snakeToCamel } from "../../../../lib/case-utils";

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user?.id) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const userId = String(user.supabase_user_id || user.id);
  const codes = await getUserReferralCodes(userId);
  return NextResponse.json(snakeToCamel(codes));
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

  const codes = await generateReferralCodes(userId);

  if (invitationCode) {
    await redeemInvitationCode(invitationCode, userId);
  }

  const rows = await getUserReferralCodes(userId);
  return NextResponse.json(snakeToCamel(rows));
}
