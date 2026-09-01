import { connection } from "next/server";
import { DM_Sans } from "next/font/google";
import { redirect } from "next/navigation";
import { requireOrganizationAccess } from "../../../../lib/enterprise/access";
import { isReservedHqSlug } from "../../../../lib/enterprise/constants";
import { EnterpriseShell } from "../../components/EnterpriseShell";
import "../../enterprise-theme.css";

const entSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-ent-sans",
  weight: ["400", "500", "600", "700"],
});

export const dynamic = "force-dynamic";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organization: string }>;
}) {
  await connection();
  const { organization } = await params;
  if (isReservedHqSlug(organization)) redirect("/dashboard");

  const { actor, membership } = await requireOrganizationAccess(organization);
  if (membership.role === "supplier_contributor") {
    redirect("/dashboard/supplier");
  }

  return (
    <div className={entSans.variable}>
      <EnterpriseShell
        email={actor.email}
        fullName={actor.fullName}
        organizationName={membership.name}
        organizationSlug={membership.slug}
        role={membership.role}
        plan={membership.plan}
        workspaceContexts={actor.contexts}
        founderHq={actor.hq}
      >
        {children}
      </EnterpriseShell>
    </div>
  );
}
