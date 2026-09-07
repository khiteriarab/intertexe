import type { SupabaseClient } from "@supabase/supabase-js";

export type SecuritySettings = {
  mfa_required: boolean;
  password_min_length: number;
  session_timeout_minutes: number;
  allowed_email_domains: string[];
  scim_enabled: boolean;
};

export async function loadSecuritySettings(
  client: SupabaseClient,
  organizationId: string
): Promise<SecuritySettings> {
  const { data } = await client
    .from("organization_security_settings")
    .select("mfa_required, password_min_length, session_timeout_minutes, allowed_email_domains, scim_enabled")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return {
    mfa_required: data?.mfa_required ?? false,
    password_min_length: data?.password_min_length ?? 12,
    session_timeout_minutes: data?.session_timeout_minutes ?? 720,
    allowed_email_domains: data?.allowed_email_domains ?? [],
    scim_enabled: data?.scim_enabled ?? false,
  };
}

export async function updateSecuritySettings(
  client: SupabaseClient,
  organizationId: string,
  patch: Partial<SecuritySettings>
) {
  const { error } = await client.from("organization_security_settings").upsert({
    organization_id: organizationId,
    ...patch,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
