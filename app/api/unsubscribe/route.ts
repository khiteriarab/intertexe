export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { unsubscribeContactFromLoops } from "@/lib/loops";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  let userId: string | null = null;
  const { data: authUser } = await supabase.auth.admin.getUserByEmail(email);
  userId = authUser.user?.id ?? null;

  const prefsUpdate = {
    email,
    marketing_emails: false,
    unsubscribed_at: now,
    updated_at: now,
  };

  if (userId) {
    await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        ...prefsUpdate,
      },
      { onConflict: "user_id" }
    );
  } else {
    await supabase.from("user_preferences").update(prefsUpdate).eq("email", email);
  }

  await unsubscribeContactFromLoops(email);

  return NextResponse.json({ success: true });
}
