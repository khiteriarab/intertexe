import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getHqSession } from "../../../../../../lib/dashboard/auth";
import { getEnterpriseServiceClient } from "../../../../../../lib/enterprise/client";
import { getEnterpriseAuthSession } from "../../../../../../lib/enterprise/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const token = String(body.token || "").trim();
  if (!token) return NextResponse.json({ message: "Missing invitation." }, { status: 400 });

  const hq = await getHqSession();
  const enterprise = await getEnterpriseAuthSession();
  const email = (hq?.email || enterprise?.email || "").toLowerCase();
  if (!email) {
    return NextResponse.json({ message: "Sign in before accepting an invitation." }, { status: 401 });
  }

  const supabase = getEnterpriseServiceClient();
  if (!supabase) {
    return NextResponse.json({ message: "Enterprise database is not linked." }, { status: 503 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: invite } = await supabase
    .from("invitations")
    .select("id, organization_id, email, role, expires_at, accepted_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!invite || invite.accepted_at) {
    return NextResponse.json({ message: "Invitation is not valid." }, { status: 400 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ message: "Invitation has expired." }, { status: 400 });
  }
  if (String(invite.email).toLowerCase() !== email) {
    return NextResponse.json({ message: "This invitation was issued to a different email." }, { status: 403 });
  }

  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  let profileId = existing?.id as string | undefined;
  if (!profileId) {
    const { data: created, error } = await supabase
      .from("profiles")
      .insert({
        email,
        full_name: hq?.fullName || enterprise?.fullName || null,
        auth_user_id: enterprise?.authUserId || null,
      })
      .select("id")
      .maybeSingle();
    if (error || !created?.id) {
      return NextResponse.json({ message: "Could not create profile." }, { status: 500 });
    }
    profileId = created.id;
  }

  await supabase.from("organization_memberships").upsert(
    {
      organization_id: invite.organization_id,
      user_id: profileId,
      role: invite.role,
      status: "active",
    },
    { onConflict: "organization_id,user_id" }
  );
  await supabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", invite.organization_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    redirectTo: org?.slug ? `/dashboard/${org.slug}` : "/dashboard",
  });
}
