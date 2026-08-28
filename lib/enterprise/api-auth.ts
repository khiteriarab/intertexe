import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { canMutateEnterprise, getOrganizationAccess } from "./access";
import type { DashboardActor } from "./access";
import type { EnterpriseMembership } from "./types";

type OrgApiOk = {
  error: null;
  access: {
    ok: true;
    actor: DashboardActor;
    membership: EnterpriseMembership;
    client: SupabaseClient;
  };
};
type OrgApiErr = { error: NextResponse; access: null };

export async function requireOrgApi(
  slug: string,
  opts?: { mutate?: boolean }
): Promise<OrgApiOk | OrgApiErr> {
  const result = await getOrganizationAccess(slug);
  if (!result.ok) {
    return {
      error: NextResponse.json({ message: result.message }, { status: result.status }),
      access: null,
    };
  }
  if (opts?.mutate && !canMutateEnterprise(result.membership.role)) {
    return {
      error: NextResponse.json({ message: "Read-only role cannot mutate records." }, { status: 403 }),
      access: null,
    };
  }
  return { error: null, access: result };
}
