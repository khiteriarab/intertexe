import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../lib/enterprise/api-auth";
import { listNotifications, markNotificationsRead, unreadNotificationCount } from "../../../../../../lib/enterprise/notifications";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  const profileId = gate.access.actor.enterpriseAuthUserId;
  if (!profileId) return NextResponse.json({ items: [], unread: 0 });
  const { data: profile } = await gate.access.client.from("profiles").select("id").eq("auth_user_id", profileId).maybeSingle();
  if (!profile?.id) return NextResponse.json({ items: [], unread: 0 });
  const [items, unread] = await Promise.all([
    listNotifications(gate.access.client, gate.access.membership.organizationId, profile.id),
    unreadNotificationCount(gate.access.client, gate.access.membership.organizationId, profile.id),
  ]);
  return NextResponse.json({ items, unread });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  const body = await request.json().catch(() => ({}));
  const { data: profile } = await gate.access.client.from("profiles").select("id").eq("auth_user_id", gate.access.actor.enterpriseAuthUserId).maybeSingle();
  if (!profile?.id) return NextResponse.json({ ok: true });
  await markNotificationsRead(
    gate.access.client,
    gate.access.membership.organizationId,
    profile.id,
    Array.isArray(body.ids) ? body.ids : undefined
  );
  return NextResponse.json({ ok: true });
}
