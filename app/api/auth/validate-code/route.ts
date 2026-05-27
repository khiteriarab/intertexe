import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_CODES = ["INTERTEXE2025", "FIBER001", "NATURAL2025", "EDITORIALVIP"];

function validInviteCodes(): Set<string> {
  const fromEnv = (process.env.INVITE_CODES || "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const codes = fromEnv.length ? fromEnv : DEFAULT_CODES;
  return new Set(codes);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({
      valid: false,
      message: "Invalid code. Please check and try again.",
    });
  }

  const valid = validInviteCodes().has(code);

  return NextResponse.json({
    valid,
    message: valid ? null : "Invalid code. Please check and try again.",
  });
}
