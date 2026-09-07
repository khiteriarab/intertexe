import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationMutation } from "../../../../../../lib/enterprise/access";
import { getEnterpriseServiceClient } from "../../../../../../lib/enterprise/client";
import { ssoConfigPublicView } from "../../../../../../lib/enterprise/sso-config";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ organization: string }> };

async function profileIdForActor(authUserId: string | null): Promise<string | null> {
  if (!authUserId) return null;
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("id").eq("auth_user_id", authUserId).maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { organization } = await context.params;
  const access = await requireOrganizationMutation(organization);
  if (!["owner", "admin"].includes(access.membership.role)) {
    return NextResponse.json({ message: "Not allowed." }, { status: 403 });
  }

  const supabase = getEnterpriseServiceClient();
  if (!supabase) {
    return NextResponse.json({ message: "Enterprise database is not configured." }, { status: 503 });
  }

  const { data } = await supabase
    .from("organization_sso_configs")
    .select(
      "id, organization_id, enabled, provider, status, sso_domain, oauth_provider_slug, issuer, allowed_email_domains, enforce_sso, allow_password_fallback, provider_label"
    )
    .eq("organization_id", access.membership.organizationId)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ configured: false, organizationSlug: access.membership.slug });
  }

  return NextResponse.json({
    configured: true,
    config: ssoConfigPublicView({ ...data, slug: access.membership.slug, name: access.membership.name }),
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { organization } = await context.params;
  const access = await requireOrganizationMutation(organization);
  if (!["owner", "admin"].includes(access.membership.role)) {
    return NextResponse.json({ message: "Not allowed." }, { status: 403 });
  }

  const supabase = getEnterpriseServiceClient();
  if (!supabase) {
    return NextResponse.json({ message: "Enterprise database is not configured." }, { status: 503 });
  }

  const body = await request.json();
  const allowedEmailDomains = Array.isArray(body.allowedEmailDomains)
    ? body.allowedEmailDomains.map((d: unknown) => String(d).trim().toLowerCase()).filter(Boolean)
    : undefined;

  const patch: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.enforceSso === "boolean") patch.enforce_sso = body.enforceSso;
  if (typeof body.allowPasswordFallback === "boolean") patch.allow_password_fallback = body.allowPasswordFallback;
  if (typeof body.providerLabel === "string") patch.provider_label = body.providerLabel.trim() || null;
  if (typeof body.status === "string") patch.status = body.status;
  if (typeof body.provider === "string") patch.provider = body.provider;
  if (typeof body.ssoDomain === "string") patch.sso_domain = body.ssoDomain.trim().toLowerCase() || null;
  if (typeof body.oauthProviderSlug === "string") {
    patch.oauth_provider_slug = body.oauthProviderSlug.trim() || null;
  }
  if (typeof body.issuer === "string") patch.issuer = body.issuer.trim() || null;
  if (allowedEmailDomains) patch.allowed_email_domains = allowedEmailDomains;

  const configuredBy = await profileIdForActor(access.actor.enterpriseAuthUserId);

  const { data: existing } = await supabase
    .from("organization_sso_configs")
    .select("id")
    .eq("organization_id", access.membership.organizationId)
    .maybeSingle();

  let configId = existing?.id as string | undefined;
  if (!configId) {
    const provider = typeof body.provider === "string" ? body.provider : "saml";
    const { data: inserted, error: insertError } = await supabase
      .from("organization_sso_configs")
      .insert({
        organization_id: access.membership.organizationId,
        provider,
        allowed_email_domains: allowedEmailDomains || [],
        configured_by: configuredBy,
      })
      .select("id")
      .maybeSingle();
    if (insertError || !inserted?.id) {
      return NextResponse.json({ message: insertError?.message || "Could not create SSO config." }, { status: 400 });
    }
    configId = inserted.id;
  }

  const { data, error } = await supabase
    .from("organization_sso_configs")
    .update({ ...patch, configured_by: configuredBy })
    .eq("id", configId)
    .select(
      "id, organization_id, enabled, provider, status, sso_domain, oauth_provider_slug, issuer, allowed_email_domains, enforce_sso, allow_password_fallback, provider_label"
    )
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ message: error?.message || "Could not update SSO config." }, { status: 400 });
  }

  if (allowedEmailDomains) {
    await supabase.from("organization_sso_domains").delete().eq("sso_config_id", configId);
    if (data.enabled && data.status === "active") {
      const rows = allowedEmailDomains.map((domain: string) => ({
        domain,
        organization_id: access.membership.organizationId,
        sso_config_id: configId,
      }));
      const { error: domainError } = await supabase.from("organization_sso_domains").insert(rows);
      if (domainError) {
        return NextResponse.json({ message: domainError.message }, { status: 409 });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    config: ssoConfigPublicView({ ...data, slug: access.membership.slug, name: access.membership.name }),
  });
}
