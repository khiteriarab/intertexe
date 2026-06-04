import { NextRequest, NextResponse } from "next/server";
import { validateInvitationCode } from "@/lib/invitation-codes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({
      valid: false,
      message: "Invalid code. Please check and try again.",
    });
  }

  const valid = await validateInvitationCode(code);

  return NextResponse.json({
    valid,
    message: valid ? null : "Invalid code. Please check and try again.",
  });
}
