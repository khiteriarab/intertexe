import { redirect } from "next/navigation";
import { getHqSession } from "../../../lib/dashboard/auth";
import { resolveDashboardActor } from "../../../lib/enterprise/access";
import { HqShell } from "../components/HqShell";

export default async function HqAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getHqSession();
  if (!session) {
    const actor = await resolveDashboardActor();
    const org = actor?.contexts.find((item) => item.type === "org");
    if (org) redirect(org.href);
    redirect("/dashboard/login");
  }

  const actor = await resolveDashboardActor();

  return (
    <HqShell
      email={session.email}
      fullName={session.fullName}
      roles={session.roles}
      workspaceName={session.workspaceName}
      workspaceContexts={actor?.contexts || []}
    >
      {children}
    </HqShell>
  );
}
