import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "@/lib/enterprise/api-auth";
import {
  PASSPORT_TEMPLATES,
  upsertProductExperienceConfig,
  type PassportTemplate,
} from "@/lib/enterprise/passport-experience";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ organization: string; productId: string }> }
) {
  const { organization, productId } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;

  const { loadProductExperienceConfig } = await import("@/lib/enterprise/passport-experience");
  const config = await loadProductExperienceConfig(
    gate.access.client,
    gate.access.membership.organizationId,
    productId
  );
  return NextResponse.json({ config });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string; productId: string }> }
) {
  const { organization, productId } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;

  const body = await request.json();
  const template = String(body.template || "editorial") as PassportTemplate;
  if (!PASSPORT_TEMPLATES.includes(template)) {
    return NextResponse.json({ message: "Invalid template." }, { status: 400 });
  }

  try {
    const config = await upsertProductExperienceConfig(gate.access.client, {
      organizationId: gate.access.membership.organizationId,
      productId,
      template,
      branding: body.branding,
      customDomain: body.customDomain,
      resolverHost: body.resolverHost,
    });
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Save failed." },
      { status: 400 }
    );
  }
}
