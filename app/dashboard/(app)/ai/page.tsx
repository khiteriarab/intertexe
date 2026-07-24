import { requireHqSession } from "../../../../lib/dashboard/auth";
import {
  buildExecutiveBriefing,
  fetchInsightsBundle,
} from "../../../../lib/dashboard/insights";
import { HqPageHeader } from "../../components/HqUi";
import { AiChatClient } from "./AiChatClient";

export const metadata = { title: "AI" };
export const dynamic = "force-dynamic";

export default async function DashboardAiPage() {
  const session = await requireHqSession();
  const { metrics, live } = await fetchInsightsBundle(session.workspaceId);
  const name = session.fullName?.split(/\s+/)[0] || "Khiteri";
  const lines = buildExecutiveBriefing(name, metrics, live);

  return (
    <div>
      <HqPageHeader
        title="Executive AI"
        description="Conversational advisor grounded in live scanner, commerce, DPP, and rule insights. Requires OPENAI_API_KEY."
      />
      <AiChatClient
        briefingLines={lines}
        actions={live.slice(0, 5).map((i) => ({
          title: i.title,
          recommendedAction: i.recommendedAction,
        }))}
      />
    </div>
  );
}
