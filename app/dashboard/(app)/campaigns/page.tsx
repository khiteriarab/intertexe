import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCampaignAttribution } from "../../../../lib/dashboard/campaign-attribution";
import DashboardCampaignsClient from "./CampaignsClient";

export const metadata = { title: "Campaigns" };
export const dynamic = "force-dynamic";

export default async function DashboardCampaignsPage() {
  const session = await requireHqSession();
  const attribution = await fetchCampaignAttribution(session.workspaceId);
  return <DashboardCampaignsClient attribution={attribution} />;
}
