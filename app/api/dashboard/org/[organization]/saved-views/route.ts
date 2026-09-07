import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../lib/enterprise/api-auth";
import { createSavedView, deleteSavedView, listSavedViews } from "../../../../../../lib/enterprise/saved-views";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  const moduleKey = request.nextUrl.searchParams.get("module") || "products";
  const { data: profile } = await gate.access.client.from("profiles").select("id").eq("auth_user_id", gate.access.actor.enterpriseAuthUserId).maybeSingle();
  if (!profile?.id) return NextResponse.json({ items: [] });
  const items = await listSavedViews(gate.access.client, gate.access.membership.organizationId, moduleKey, profile.id);
  return NextResponse.json({ items });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const body = await request.json();
  const { data: profile } = await gate.access.client.from("profiles").select("id").eq("auth_user_id", gate.access.actor.enterpriseAuthUserId).maybeSingle();
  if (!profile?.id) return NextResponse.json({ message: "Profile required." }, { status: 400 });
  const view = await createSavedView({
    client: gate.access.client,
    organizationId: gate.access.membership.organizationId,
    ownerId: profile.id,
    moduleKey: String(body.moduleKey || "products"),
    name: String(body.name || "Saved view"),
    filters: body.filters || {},
    shared: Boolean(body.shared),
  });
  return NextResponse.json({ ok: true, view });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  const { data: profile } = await gate.access.client.from("profiles").select("id").eq("auth_user_id", gate.access.actor.enterpriseAuthUserId).maybeSingle();
  if (!profile?.id) return NextResponse.json({ message: "Profile required." }, { status: 400 });
  await deleteSavedView(gate.access.client, gate.access.membership.organizationId, profile.id, id);
  return NextResponse.json({ ok: true });
}
