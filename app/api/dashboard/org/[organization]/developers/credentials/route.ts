import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import { createApiCredential, listApiCredentials, revokeApiCredential } from "../../../../../../../lib/enterprise/api-credentials";
import { createWebhook, listWebhooks, revokeWebhook } from "../../../../../../../lib/enterprise/webhooks-admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  const [credentials, webhooks] = await Promise.all([
    listApiCredentials(gate.access.client, gate.access.membership.organizationId),
    listWebhooks(gate.access.client, gate.access.membership.organizationId),
  ]);
  return NextResponse.json({ credentials, webhooks });
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

  if (body.kind === "api_key") {
    const created = await createApiCredential({
      client: gate.access.client,
      organizationId: gate.access.membership.organizationId,
      name: String(body.name || "API key"),
      scopes: body.scopes,
      createdBy: profile?.id || null,
    });
    return NextResponse.json({ ok: true, ...created });
  }
  if (body.kind === "webhook") {
    const created = await createWebhook({
      client: gate.access.client,
      organizationId: gate.access.membership.organizationId,
      url: String(body.url),
      label: body.label,
      events: body.events,
    });
    return NextResponse.json({ ok: true, ...created });
  }
  return NextResponse.json({ message: "Unknown kind." }, { status: 400 });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const kind = request.nextUrl.searchParams.get("kind");
  const id = request.nextUrl.searchParams.get("id");
  if (!kind || !id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  if (kind === "api_key") {
    await revokeApiCredential(gate.access.client, gate.access.membership.organizationId, id);
  } else if (kind === "webhook") {
    await revokeWebhook(gate.access.client, gate.access.membership.organizationId, id);
  }
  return NextResponse.json({ ok: true });
}
