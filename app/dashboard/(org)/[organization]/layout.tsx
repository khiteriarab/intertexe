import { connection } from "next/server";
import { DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getHqSession } from "../../../../lib/dashboard/auth";
import { requireOrganizationAccess } from "../../../../lib/enterprise/access";
import { ENTERPRISE_SESSION_COOKIE, isReservedHqSlug } from "../../../../lib/enterprise/constants";
import { mintStaffEnterpriseHandoff } from "../../../../lib/enterprise/handoff";
import { getEnterpriseAuthSession } from "../../../../lib/enterprise/session";
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

  const [hq, enterprise] = await Promise.all([getHqSession(), getEnterpriseAuthSession()]);
  if (hq && !enterprise) {
    try {
      const minted = await mintStaffEnterpriseHandoff({
        hqUserId: hq.authUserId,
        hqEmail: hq.email,
        slug: organization,
      });
      const maxAge = Math.max(1, Math.floor((minted.expiresAt.getTime() - Date.now()) / 1000));
      const cookieStore = await cookies();
      cookieStore.set(ENTERPRISE_SESSION_COOKIE, minted.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge,
      });
    } catch {
      redirect("/dashboard");
    }
  }

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
