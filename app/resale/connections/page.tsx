import { providerSummaries } from "../../../lib/resale/providers";
import ResaleConnectionsClient from "./ResaleConnectionsClient";

export const dynamic = "force-dynamic";

export default function ResaleConnectionsPage() {
  return <ResaleConnectionsClient providers={providerSummaries()} />;
}
