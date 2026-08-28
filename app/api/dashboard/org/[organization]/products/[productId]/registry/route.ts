import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import {
  attachEuRegistrationIdentifier,
  loadRegistryRegistration,
  prepareRegistryRegistration,
  recordRegistrySubmission,
} from "../../../../../../../lib/enterprise/registry/service";
import type { RegistryEnvironment } from "../../../../../../../lib/enterprise/registry/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ organization: string; productId: string }> }
) {
  const { organization, productId } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;

  const { data: passport } = await gate.access.client
    .from("passports")
    .select("id, current_version_id, public_id, state")
    .eq("organization_id", gate.access.membership.organizationId)
    .eq("product_id", productId)
    .maybeSingle();

  if (!passport?.current_version_id) {
    return NextResponse.json({
      status: "not_registered",
      message: "Publish a passport before registry preparation.",
    });
  }

  const registration = await loadRegistryRegistration(
    gate.access.client,
    gate.access.membership.organizationId,
    passport.current_version_id
  );

  return NextResponse.json({
    passportId: passport.id,
    passportVersionId: passport.current_version_id,
    publicId: passport.public_id,
    registration,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string; productId: string }> }
) {
  const { organization, productId } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;

  const body = await request.json();
  const action = String(body.action || "prepare");
  const environment = (body.environment || "sandbox") as RegistryEnvironment;

  const { data: passport } = await gate.access.client
    .from("passports")
    .select("id, current_version_id")
    .eq("organization_id", gate.access.membership.organizationId)
    .eq("product_id", productId)
    .maybeSingle();
  if (!passport?.current_version_id) {
    return NextResponse.json({ message: "Published passport required." }, { status: 400 });
  }

  const { data: profile } = await gate.access.client.from("profiles").select("id").maybeSingle();
  const actorId = profile?.id || null;

  try {
    if (action === "prepare") {
      const result = await prepareRegistryRegistration({
        client: gate.access.client,
        organizationId: gate.access.membership.organizationId,
        passportId: passport.id,
        passportVersionId: passport.current_version_id,
        productId,
        environment,
        actorId,
      });
      return NextResponse.json(result);
    }
    if (action === "record_submission") {
      await recordRegistrySubmission({
        client: gate.access.client,
        organizationId: gate.access.membership.organizationId,
        passportVersionId: passport.current_version_id,
        environment,
        actorId,
        registryResponse: body.registryResponse,
      });
      return NextResponse.json({ ok: true, status: "submitted" });
    }
    if (action === "attach_registration") {
      const euId = String(body.euRegistrationIdentifier || "").trim();
      if (!euId) {
        return NextResponse.json({ message: "EU registration identifier required." }, { status: 400 });
      }
      await attachEuRegistrationIdentifier({
        client: gate.access.client,
        organizationId: gate.access.membership.organizationId,
        passportVersionId: passport.current_version_id,
        euRegistrationIdentifier: euId,
        environment,
        actorId,
        registryResponse: body.registryResponse,
      });
      return NextResponse.json({ ok: true, status: "registered" });
    }
    return NextResponse.json({ message: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Registry action failed." },
      { status: 400 }
    );
  }
}
