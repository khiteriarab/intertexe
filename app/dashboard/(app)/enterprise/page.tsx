import { requireHqSession } from "../../../../lib/dashboard/auth";
import { getEnterpriseServiceClient } from "../../../../lib/enterprise/client";
import { HqPageHeader } from "../../components/HqUi";
import { SnapshotAdminClient } from "./SnapshotAdminClient";

export const dynamic = "force-dynamic";

export default async function EnterpriseAdminPage() {
  await requireHqSession({ roles: ["founder"] });
  const supabase = getEnterpriseServiceClient();
  const { data } = supabase
    ? await supabase
        .from("organizations")
        .select("id, slug, name, plan, kind, snapshot_stage, product_allowance, hq_deal_id, created_at")
        .in("kind", ["snapshot", "pilot", "customer"])
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  return (
    <div>
      <HqPageHeader
        title="Enterprise"
        description="Create snapshot workspaces, inspect organization health, and upgrade prospects in place. This area is INTERTEXE-only and is not shown in customer navigation."
      />
      <SnapshotAdminClient configured={Boolean(supabase)} initial={data || []} />
    </div>
  );
}
