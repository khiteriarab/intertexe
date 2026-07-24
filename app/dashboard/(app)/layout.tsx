import { redirect } from "next/navigation";
import { getHqSession } from "../../../lib/dashboard/auth";
import { HqShell } from "../components/HqShell";

export default async function HqAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getHqSession();
  if (!session) redirect("/dashboard/login");

  return (
    <HqShell
      email={session.email}
      fullName={session.fullName}
      roles={session.roles}
      workspaceName={session.workspaceName}
    >
      {children}
    </HqShell>
  );
}
