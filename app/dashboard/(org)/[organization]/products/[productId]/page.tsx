import { notFound } from "next/navigation";
import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../../lib/enterprise/access";
import { loadOrgProduct } from "../../../../../../lib/enterprise/queries";
import { publishabilityForProduct } from "../../../../../../lib/enterprise/publish";
import { HqCard, HqPageHeader } from "../../../../components/HqUi";
import { IssueActions } from "../../issues/IssueActions";
import { PublishPassportButton } from "../../passports/PublishPassportButton";
import { ApproveFieldsButton } from "./ApproveFieldsButton";

export const dynamic = "force-dynamic";

const SECTIONS = [
  "Identity",
  "Materials",
  "Manufacturing",
  "Care / Circularity",
  "Certifications & Evidence",
  "Source Records",
  "Issues",
  "DPP Requirements",
  "Passport",
  "Version History",
];

export default async function ProductRecordPage({
  params,
}: {
  params: Promise<{ organization: string; productId: string }>;
}) {
  const { organization, productId } = await params;
  const { membership } = await requireOrganizationAccess(organization);
  const record = await loadOrgProduct(membership.organizationId, productId);
  if (!record) notFound();
  const canMutate = canMutateEnterprise(membership.role);
  const publishability = await publishabilityForProduct(membership.organizationId, productId);

  return (
    <div>
      <HqPageHeader
        title={String(record.product.name || "Product")}
        description="Normalized fields retain original value, normalized value, source, confidence, state, explanation, evidence, reviewer, and timestamp. Missing data is never invented."
      />
      <div className="grid gap-4">
        <HqCard title="Identity">
          <dl className="grid sm:grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-black/45">Internal product ID</dt>
              <dd className="font-mono text-xs break-all">{record.product.id}</dd>
            </div>
            <div>
              <dt className="text-black/45">SKU</dt>
              <dd>{record.product.sku || "—"}</dd>
            </div>
            <div>
              <dt className="text-black/45">Style</dt>
              <dd>{record.product.style_code || "—"}</dd>
            </div>
            <div>
              <dt className="text-black/45">Identifiers</dt>
              <dd>
                {record.identifiers.length
                  ? record.identifiers
                      .map((row) => `${row.identifier_type}:${row.identifier_value}`)
                      .join(", ")
                  : "None"}
              </dd>
            </div>
          </dl>
        </HqCard>

        <HqCard title="Normalized fields">
          {record.fields.length === 0 ? (
            <p className="text-sm text-black/55">No normalized fields yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-black/45">
                    {["Field", "Original", "Normalized", "State", "Confidence", "Source", "Reviewer"].map(
                      (col) => (
                        <th key={col} className="pr-4 py-1">
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {record.fields.map((field) => (
                    <tr key={field.id} className="border-t border-black/5">
                      <td className="pr-4 py-2">{field.field_key}</td>
                      <td className="pr-4 py-2">{field.original_value || "—"}</td>
                      <td className="pr-4 py-2">{field.normalized_value || "—"}</td>
                      <td className="pr-4 py-2">{field.state}</td>
                      <td className="pr-4 py-2">
                        {field.confidence != null ? String(field.confidence) : "—"}
                      </td>
                      <td className="pr-4 py-2 font-mono text-xs">
                        {field.source_record_id ? String(field.source_record_id).slice(0, 8) : "—"}
                      </td>
                      <td className="pr-4 py-2">
                        {field.reviewer_id ? String(field.reviewer_id).slice(0, 8) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </HqCard>

        <HqCard title="Source records">
          {record.sourceRecords.length === 0 ? (
            <p className="text-sm text-black/55">No immutable source records stored yet.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {record.sourceRecords.map((row) => (
                <li key={row.id}>
                  {row.source_system || "source"} · {row.payload_hash.slice(0, 12)} ·{" "}
                  {row.retrieved_at || row.created_at}
                </li>
              ))}
            </ul>
          )}
        </HqCard>

        <HqCard title="Issues">
          {record.issues.length === 0 ? (
            <p className="text-sm text-black/55">No issues on this product.</p>
          ) : (
            <ul className="text-sm space-y-3">
              {record.issues.map((issue) => (
                <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {issue.issue_type}: {issue.title} ({issue.status})
                  </span>
                  {issue.status === "open" ? (
                    <IssueActions slug={membership.slug} issueId={issue.id} canMutate={canMutate} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </HqCard>

        <HqCard title="Review and DPP requirements">
          <p className="text-sm text-black/60 mb-3">
            {publishability.status === "ready"
              ? "Phase 1 DPP requirements met. Publication is allowed."
              : `Not ready: ${publishability.blockers.join("; ")}`}
          </p>
          <div className="flex flex-wrap gap-3">
            <ApproveFieldsButton slug={membership.slug} productId={productId} canMutate={canMutate} />
            <PublishPassportButton slug={membership.slug} productId={productId} canMutate={canMutate} />
          </div>
        </HqCard>

        {SECTIONS.filter(
          (section) =>
            !["Identity", "Source Records", "Issues", "DPP Requirements", "Passport"].includes(section)
        ).map((section) => (
          <HqCard key={section} title={section}>
            <p className="text-sm text-black/55">No records in this section yet.</p>
          </HqCard>
        ))}
      </div>
    </div>
  );
}
