import { requireHqSession } from "../../../../lib/dashboard/auth";
import ContentCalendarClient from "./ContentCalendarClient";

export const metadata = { title: "Content" };
export const dynamic = "force-dynamic";

export default async function DashboardContentPage() {
  await requireHqSession();
  return <ContentCalendarClient />;
}
