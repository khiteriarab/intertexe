import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CUSTOMER_ZERO_SLUG, DEMO_BRAND_SLUG, technicalPrincipalEmail } from "./constants";
import { getIdentityLinkByEnterpriseUserId } from "./identity-links";
import { publicSiteOrigin } from "./founder-invitations";

const CUSTOMER_ORG_KINDS = new Set(["snapshot", "pilot", "customer"]);
const ALLOWED_ROLES = new Set([
  "owner",
  "admin",
  "product_manager",
  "sustainability",
  "reviewer",
  "developer",
  "read_only",
  "supplier_contributor",
]);

export type ProvisionBrandOperatorResult =
  | {
      status: "provisioned";
      profileId: string;
      authUserId: string;
      membershipRole: string;
      setupLink: string | null;
      setupLinkKind: "invite" | "none" | "transitional_password";
      transitionalPassword?: string;
      message: string;
    }
  | {
      status: "already_member";
      profileId: string;
      authUserId: string;
      membershipRole: string;
      message: string;
    }
  | {
      status: "needs_cross_org_confirmation";
      email: string;
      otherOrganizations: Array<{ slug: string; name: string; role: string }>;
      message: string;
    };

async function findEnterpriseAuthUserIdByEmail(
  client: SupabaseClient,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((user) => user.email?.trim().toLowerCase() === target);
    if (hit?.id) return hit.id;
    if (!data.users.length || data.users.length < 200) return null;
    page += 1;
    if (page > 20) return null;
  }
}

function isTechnicalPrincipalEmail(email: string): boolean {
  return email.includes("@identity.intertexe.com");
}

export async function provisionBrandOperator(input: {
  client: SupabaseClient;
  organizationId: string;
  email: string;
  fullName: string;
  role: string;
  actorEmail: string;
  confirmCrossOrg?: boolean;
}): Promise<ProvisionBrandOperatorResult> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const role = input.role.trim();
  if (!email || !fullName) throw new Error("Email and full name are required.");
  if (!ALLOWED_ROLES.has(role)) throw new Error("Role is not allowed for brand operators.");

  const { data: org } = await input.client
    .from("organizations")
    .select("id, slug, name, kind")
    .eq("id", input.organizationId)
    .maybeSingle();
  if (!org?.id) throw new Error("Organization not found.");
  if (!CUSTOMER_ORG_KINDS.has(String(org.kind))) {
    throw new Error("Provisioning is only allowed for customer workspaces.");
  }
  if (org.slug === CUSTOMER_ZERO_SLUG || org.slug === DEMO_BRAND_SLUG) {
    throw new Error("Provisioning is not allowed for reserved organizations.");
  }
  if (isTechnicalPrincipalEmail(email)) {
    throw new Error("Technical principal emails cannot be used for brand operators.");
  }

  let authUserId = await findEnterpriseAuthUserIdByEmail(input.client, email);
  let setupLink: string | null = null;
  let setupLinkKind: "invite" | "none" | "transitional_password" = "none";
  let transitionalPassword: string | undefined;

  if (authUserId) {
    if (await getIdentityLinkByEnterpriseUserId(authUserId)) {
      throw new Error("This Enterprise account is linked to HQ staff and cannot be used as a brand operator.");
    }
  } else {
    const redirectTo = `${publicSiteOrigin()}/dashboard/login`;
    const { data: linkData, error: linkError } = await input.client.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo, data: { full_name: fullName } },
    });
    if (linkData?.user?.id) {
      authUserId = linkData.user.id;
      setupLink = linkData.properties?.action_link || null;
      setupLinkKind = setupLink ? "invite" : "none";
      await input.client.auth.admin.updateUserById(authUserId, { email_confirm: true });
    } else {
      const password = randomBytes(24).toString("base64url");
      const { data: created, error: createError } = await input.client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError || !created.user?.id) {
        throw new Error(linkError?.message || createError?.message || "Could not create Enterprise Auth user.");
      }
      authUserId = created.user.id;
      setupLinkKind = "transitional_password";
      transitionalPassword = password;
    }
  }

  const { data: profileByAuth } = authUserId
    ? await input.client.from("profiles").select("id, email, auth_user_id").eq("auth_user_id", authUserId).maybeSingle()
    : { data: null };
  const { data: profileByEmail } = profileByAuth?.id
    ? { data: profileByAuth }
    : await input.client.from("profiles").select("id, email, auth_user_id").eq("email", email).maybeSingle();

  let profileId = profileByEmail?.id as string | undefined;
  if (!profileId) {
    const { data: createdProfile, error } = await input.client
      .from("profiles")
      .insert({
        email,
        full_name: fullName,
        auth_user_id: authUserId,
        intertexe_super_admin: false,
      })
      .select("id")
      .maybeSingle();
    if (error || !createdProfile?.id) throw new Error(error?.message || "Could not create profile.");
    profileId = createdProfile.id;
  } else {
    await input.client
      .from("profiles")
      .update({
        auth_user_id: authUserId,
        full_name: fullName,
        intertexe_super_admin: false,
      })
      .eq("id", profileId);
  }

  const { data: memberships } = await input.client
    .from("organization_memberships")
    .select("organization_id, role, status, organizations(slug, name)")
    .eq("user_id", profileId)
    .eq("status", "active");

  const sameOrg = (memberships || []).find((row) => row.organization_id === org.id);
  if (sameOrg) {
    return {
      status: "already_member",
      profileId,
      authUserId: authUserId!,
      membershipRole: String(sameOrg.role),
      message: `Operator already has active ${sameOrg.role} membership in ${org.slug}.`,
    };
  }

  const otherOrgs = (memberships || [])
    .filter((row) => row.organization_id !== org.id)
    .map((row) => {
      const nested = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
      return {
        slug: String(nested?.slug || "unknown"),
        name: String(nested?.name || "Unknown"),
        role: String(row.role),
      };
    })
    .filter((row) => row.slug !== CUSTOMER_ZERO_SLUG && row.slug !== DEMO_BRAND_SLUG);

  if (otherOrgs.length && !input.confirmCrossOrg) {
    return {
      status: "needs_cross_org_confirmation",
      email,
      otherOrganizations: otherOrgs,
      message: "Operator already belongs to another organization. Confirm before adding this workspace.",
    };
  }

  const { error: membershipError } = await input.client.from("organization_memberships").upsert(
    {
      organization_id: org.id,
      user_id: profileId,
      role,
      status: "active",
    },
    { onConflict: "organization_id,user_id" }
  );
  if (membershipError) throw new Error(membershipError.message);

  await input.client.from("audit_logs").insert({
    organization_id: org.id,
    action: "operator_provisioned",
    object_type: "profile",
    object_id: profileId,
    request_meta: {
      actor_email: input.actorEmail,
      operator_email: email,
      role,
      auth_user_id: authUserId,
      cross_org_confirmed: Boolean(input.confirmCrossOrg && otherOrgs.length),
    },
  });

  return {
    status: "provisioned",
    profileId,
    authUserId: authUserId!,
    membershipRole: role,
    setupLink,
    setupLinkKind,
    ...(transitionalPassword ? { transitionalPassword } : {}),
    message:
      setupLinkKind === "invite"
        ? "Operator provisioned. Copy the setup link so they can set a password, then share the workspace invite link."
        : setupLinkKind === "transitional_password"
          ? "Operator provisioned with a one-time transitional password. Share it securely once, then ask them to change it after first sign-in."
          : "Operator provisioned. They can sign in with their existing Enterprise password.",
  };
}
