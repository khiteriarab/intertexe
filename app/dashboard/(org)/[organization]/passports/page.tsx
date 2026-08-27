import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgPassports } from "../../../../../lib/enterprise/queries";
import { HqPageHeader } from "../../../components/HqUi";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";
import { StateBadge } from "../StateBadge";

export const dynamic = "force-dynamic";

export default async function PassportsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership } = await requireOrganizationAccess(organization);
  const passports = await loadOrgPassports(membership.organizationId);

  return (
    <div>
      <HqPageHeader
        title="Passports"
        description="Publication is decided server-side. A published version cannot be silently overwritten. QR codes resolve a stable public identifier — they do not embed the full record."
        action={<StateBadge state={ORG_PAGE_STATES.passports} />}
      />
      <div className="overflow-x-auto bg-white border border-black/10 rounded-xl">
        <table className="min-w-full text-sm">
          <caption className="sr-only">Organization passports</caption>
          <thead>
            <tr className="text-left text-[10px] tracking-[0.12em] uppercase text-black/45 border-b border-black/10">
              {["Public ID", "State", "QR / resolver", "Preview"].map((col) => (
                <th key={col} className="px-3 py-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {passports.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-black/50">
                  No passports yet. Records become publishable only after identity, required fields,
                  conflicts, validations, and approvals pass.
                </td>
              </tr>
            ) : (
              passports.map((passport) => (
                <tr key={passport.id} className="border-t border-black/5">
                  <td className="px-3 py-2 font-mono text-xs">{passport.public_id}</td>
                  <td className="px-3 py-2">{passport.state}</td>
                  <td className="px-3 py-2 font-mono text-xs break-all">
                    {passport.state === "published" ? passport.publicUrl : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {passport.state === "published" ? (
                      <Link className="underline" href={`/p/${passport.public_id}`}>
                        Open public passport
                      </Link>
                    ) : passport.product_id ? (
                      <Link className="underline" href={`/dashboard/${membership.slug}/products/${passport.product_id}`}>
                        Review product
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
