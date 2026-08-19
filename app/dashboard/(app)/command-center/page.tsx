import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchRevenueCommandCenter } from "../../../../lib/dashboard/revenue-command-center";
import { HqPageHeader } from "../../components/HqUi";
import { CommandCenterClient } from "./CommandCenterClient";

export const metadata = {
  title: "$50K Command Center",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Private founder command center. Not the future client-facing SaaS dashboard:
 * this plan, personal creator revenue, pipeline and API client data must never
 * appear on a public or customer route.
 */
export default async function CommandCenterPage() {
  const session = await requireHqSession({ roles: ["founder"] });
  const bundle = await fetchRevenueCommandCenter(session.workspaceId);

  return (
    <div>
      <HqPageHeader
        title="$50K Command Center"
        description="Interactive $50K booking plan: five $5,000 Founding Material Data Pilots sold on /platform, one integration, and creator plus affiliate buffer. Founder-only."
      />
      <CommandCenterClient bundle={bundle} />
    </div>
  );
}
