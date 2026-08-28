import { randomBytes } from "node:crypto";
import { getServerSupabase } from "../supabase-service-client";
import { getEnterpriseServiceClient } from "./client";
import { CUSTOMER_ZERO_SLUG, technicalPrincipalEmail } from "./constants";
import { getActiveIdentityLinkByHqUserId, upsertActiveIdentityLink } from "./identity-links";

export type ProvisionedStaffPrincipal = {
  hqUserId: string;
  enterpriseUserId: string;
  profileId: string;
  organizationId: string;
  principalEmail: string;
};

async function findHqAuthUserIdByEmail(email: string): Promise<string | null> {
  const hq = getServerSupabase();
  if (!hq) return null;
  const target = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await hq.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((user) => user.email?.trim().toLowerCase() === target);
    if (hit?.id) return hit.id;
    if (!data.users.length || data.users.length < 200) return null;
    page += 1;
    if (page > 20) return null;
  }
}

/**
 * One-time administrative provisioner. Email is used only to find the existing
 * HQ Auth user, then the mapping is stored as UUIDs.
 */
export async function provisionStaffEnterprisePrincipal(input: {
  hqEmail: string;
  hqUserId?: string;
  organizationSlug?: string;
  fullName?: string | null;
  createdBy?: string | null;
}): Promise<ProvisionedStaffPrincipal> {
  const hq = getServerSupabase();
  const enterprise = getEnterpriseServiceClient();
  if (!hq || !enterprise) throw new Error("Both HQ and Enterprise service clients are required.");

  const hqEmail = input.hqEmail.trim().toLowerCase();
  const hqUserId = input.hqUserId || (await findHqAuthUserIdByEmail(hqEmail));
  if (!hqUserId) throw new Error(`HQ Auth user not found for ${hqEmail}.`);

  const existingLink = await getActiveIdentityLinkByHqUserId(hqUserId);

  const slug = input.organizationSlug || CUSTOMER_ZERO_SLUG;
  const { data: org } = await enterprise
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!org?.id) throw new Error(`Enterprise organization '${slug}' was not found.`);

  const principalEmail = technicalPrincipalEmail(hqUserId);
  let enterpriseUserId = existingLink?.enterprise_user_id || "";
  if (!enterpriseUserId) {
    const { data: created, error } = await enterprise.auth.admin.createUser({
      email: principalEmail,
      password: randomBytes(32).toString("base64url"),
      email_confirm: true,
      user_metadata: {
        principal_kind: "hq_linked",
        password_login_disabled: true,
        hq_user_id: hqUserId,
      },
    });
    if (created.user?.id) {
      enterpriseUserId = created.user.id;
    } else {
      const { data: viaLink } = await enterprise.auth.admin.generateLink({
        type: "magiclink",
        email: principalEmail,
      });
      enterpriseUserId = viaLink?.user?.id || "";
      if (!enterpriseUserId) {
        throw new Error(error?.message || "Could not create Enterprise principal.");
      }
    }
  }

  const { data: byAuth } = await enterprise
    .from("profiles")
    .select("id")
    .eq("auth_user_id", enterpriseUserId)
    .maybeSingle();
  const { data: byEmail } = byAuth?.id
    ? { data: byAuth }
    : await enterprise.from("profiles").select("id").eq("email", hqEmail).maybeSingle();

  let profileId = byEmail?.id as string | undefined;
  if (!profileId) {
    const { data: createdProfile, error } = await enterprise
      .from("profiles")
      .insert({
        email: hqEmail,
        full_name: input.fullName || null,
        auth_user_id: enterpriseUserId,
        intertexe_super_admin: false,
      })
      .select("id")
      .maybeSingle();
    if (error || !createdProfile?.id) throw new Error(error?.message || "Could not create Enterprise profile.");
    profileId = createdProfile.id;
  } else {
    await enterprise
      .from("profiles")
      .update({
        auth_user_id: enterpriseUserId,
        full_name: input.fullName || undefined,
        intertexe_super_admin: false,
      })
      .eq("id", profileId);
  }

  const { error: membershipError } = await enterprise.from("organization_memberships").upsert(
    {
      organization_id: org.id,
      user_id: profileId,
      role: "owner",
      status: "active",
    },
    { onConflict: "organization_id,user_id" }
  );
  if (membershipError) throw new Error(membershipError.message);

  await upsertActiveIdentityLink({
    hqUserId,
    enterpriseUserId,
    createdBy: input.createdBy || hqUserId,
    emailAudit: hqEmail,
  });

  return {
    hqUserId,
    enterpriseUserId,
    profileId,
    organizationId: org.id,
    principalEmail,
  };
}
