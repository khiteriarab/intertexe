import { requireHqSession } from "../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../lib/dashboard/company-hq";
import { CompanyHqOverview } from "../components/CompanyHqOverview";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function HqOverviewPage() {
  const session = await requireHqSession();
  const bundle = await fetchCompanyHqBundle(session.workspaceId, "year1");
  return <CompanyHqOverview bundle={bundle} />;
}
