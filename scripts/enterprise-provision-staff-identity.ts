import { HQ_FOUNDER_EMAILS } from "../lib/dashboard/constants.ts";
import { provisionStaffEnterprisePrincipal } from "../lib/enterprise/provision-staff-principal.ts";

async function main() {
  const email = [...HQ_FOUNDER_EMAILS][0];
  if (!email) throw new Error("HQ_FOUNDER_EMAILS is empty.");
  const result = await provisionStaffEnterprisePrincipal({
    hqEmail: email,
    fullName: "INTERTEXE Founder",
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        hqUserId: result.hqUserId,
        enterpriseUserId: result.enterpriseUserId,
        profileId: result.profileId,
        organizationId: result.organizationId,
        principalEmail: result.principalEmail,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
