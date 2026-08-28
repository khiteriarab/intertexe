import Link from "next/link";
import { notFound } from "next/navigation";
import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../../lib/enterprise/access";
import {
  identifierClassLabel,
  parseIdentifierIssueDetail,
} from "../../../../../../lib/enterprise/identity-reconciliation";
import {
  issueBlocksPublish,
  issueRecommendedAction,
  issueTypeLabel,
  issueWhyItMatters,
  passportStateLabel,
} from "../../../../../../lib/enterprise/issue-copy";
import { loadOrgProduct } from "../../../../../../lib/enterprise/queries";
import { publishabilityForProduct } from "../../../../../../lib/enterprise/publish";
import {
  formatOperatorTime,
  formatReviewerLine,
} from "../../../../../../lib/enterprise/reviewer-display";
import { HqCard, HqPageHeader } from "../../../../components/HqUi";
import { IssueActions } from "../../issues/IssueActions";
import { PassportQr } from "../../passports/PassportQr";
import { PublishPassportButton } from "../../passports/PublishPassportButton";
import { ApproveFieldsButton } from "./ApproveFieldsButton";

export const dynamic = "force-dynamic";

function payloadPreview(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return "—";
  }
}

export default async function ProductRecordPage({
  params,
}: {
  params: Promise<{ organization: string; productId: string }>;
}) {
  const { organization, productId } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const record = await loadOrgProduct(client, membership.organizationId, productId);
  if (!record) notFound();
  const canMutate = canMutateEnterprise(membership.role);
  const publishability = await publishabilityForProduct(client, membership.organizationId, productId);
  const identifierIssues = [
    ...record.issues.filter((issue) => issue.issue_type === "identifier"),
    ...record.relatedIdentifierIssues,
  ];
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com").replace(/\/$/, "");
  const publicUrl = record.passport
    ? record.passport.publicUrl.startsWith("http")
      ? record.passport.publicUrl
      : `${origin}${record.passport.publicUrl}`
    : null;

  return (
    <div>
      <HqPageHeader
        title={String(record.product.name || "Product")}
        description={`${passportStateLabel(record.product.passport_state)} · Source values stay as uploaded. Canonical values are what INTERTEXE will publish after you review them.`}
      />
      <p className="text-sm text-black/60 mb-4">
        {publishability.status === "ready"
          ? "Nothing is blocking a passport. Preview the public fields, then publish."
          : `Blocking this passport: ${publishability.blockers.join("; ")}.`}
      </p>
      <div className="grid gap-4">
        <HqCard title="Identity">
          <dl className="grid sm:grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-black/45">SKU</dt>
              <dd>{record.product.sku || "—"}</dd>
            </div>
            <div>
              <dt className="text-black/45">Style</dt>
              <dd>{record.product.style_code || "—"}</dd>
            </div>
            <div>
              <dt className="text-black/45">Category</dt>
              <dd>{record.product.category || "—"}</dd>
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
            {record.variants.length ? (
              <div className="sm:col-span-2">
                <dt className="text-black/45">Variants</dt>
                <dd>
                  {record.variants
                    .map((row) => [row.name, row.sku, row.gtin].filter(Boolean).join(" · "))
                    .join("; ")}
                </dd>
              </div>
            ) : null}
          </dl>
        </HqCard>

        {identifierIssues.length ? (
          <HqCard title="Identifier reconciliation">
            <p className="text-sm text-black/60 mb-3">
              These source rows share a GTIN, SKU, or style. They were not silently collapsed.
              Source files remain unchanged.
            </p>
            <ul className="space-y-3">
              {identifierIssues.map((issue) => {
                const ident = parseIdentifierIssueDetail(issue.detail);
                return (
                  <li key={issue.id} className="text-sm border border-black/10 rounded-lg p-3">
                    <p className="font-medium">
                      {ident ? identifierClassLabel(ident.classification) : issue.title}
                    </p>
                    {ident ? (
                      <p className="text-black/60 mt-1">
                        Matched on {ident.matchOn} {ident.identifierValue} · incoming{" "}
                        {ident.incoming.sku || ident.incoming.name}
                        {ident.incoming.rowIndex != null ? ` (row ${ident.incoming.rowIndex + 1})` : ""}{" "}
                        ↔ {ident.matched?.name || ident.matched?.sku || "catalog product"}
                      </p>
                    ) : null}
                    {issue.status === "open" ? (
                      <div className="mt-2">
                        <IssueActions
                          slug={membership.slug}
                          issueId={issue.id}
                          canMutate={canMutate}
                          kind={ident ? "identifier" : "standard"}
                        />
                      </div>
                    ) : ident?.resolution ? (
                      <p className="text-black/55 mt-2">
                        {ident.resolution.actorName}
                        {ident.resolution.actorRole ? ` · ${ident.resolution.actorRole.replaceAll("_", " ")}` : ""}
                        {ident.resolution.at ? ` · ${formatOperatorTime(ident.resolution.at)}` : ""}
                        {" · "}
                        {ident.resolution.action.replaceAll("_", " ")}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </HqCard>
        ) : null}

        <HqCard title="Source vs canonical">
          {record.fields.length === 0 ? (
            <p className="text-sm text-black/55">No normalized fields yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-black/45">
                    {["Field", "Source (original)", "Canonical", "State", "Why / provenance", "Reviewer"].map(
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
                    <tr key={field.id} className="border-t border-black/5 align-top">
                      <td className="pr-4 py-2">{field.field_key}</td>
                      <td className="pr-4 py-2">{field.original_value || "—"}</td>
                      <td className="pr-4 py-2">{field.normalized_value || "—"}</td>
                      <td className="pr-4 py-2">{field.state}</td>
                      <td className="pr-4 py-2 text-xs text-black/60 max-w-sm">
                        {field.explanation || field.transformation_method || "Copied from source."}
                      </td>
                      <td className="pr-4 py-2 text-xs">
                        {field.reviewer_id
                          ? formatReviewerLine(field.reviewer, field.updated_at)
                          : "Not reviewed"}
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
            <ul className="text-sm space-y-3">
              {record.sourceRecords.map((row, index) => (
                <li key={row.id} className="border border-black/10 rounded-lg p-3">
                  <p>
                    Source {index + 1} · {row.source_system || "upload"} ·{" "}
                    {formatOperatorTime(row.retrieved_at || row.created_at)}
                  </p>
                  {"original_payload" in row && row.original_payload ? (
                    <pre className="mt-2 text-[11px] bg-[#f6f5f3] p-2 overflow-x-auto whitespace-pre-wrap">
                      {payloadPreview(row.original_payload)}
                    </pre>
                  ) : (
                    <p className="text-xs text-black/45 mt-1">Original payload stored; hash {row.payload_hash.slice(0, 12)}</p>
                  )}
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
                <li key={issue.id} className="border border-black/10 rounded-lg p-3">
                  <p className="font-medium">
                    {issueTypeLabel(issue.issue_type)}: {issue.title}
                  </p>
                  <p className="text-black/60 mt-1">{issueWhyItMatters(issue)}</p>
                  <p className="text-xs text-black/45 mt-1">
                    {issueBlocksPublish(issue) ? "Blocks publish" : "Does not block publish"} ·{" "}
                    {issueRecommendedAction(issue)}
                  </p>
                  {issue.status === "open" ? (
                    <div className="mt-2">
                      <IssueActions
                        slug={membership.slug}
                        issueId={issue.id}
                        canMutate={canMutate}
                        kind={parseIdentifierIssueDetail(issue.detail) ? "identifier" : "standard"}
                      />
                    </div>
                  ) : (
                    <p className="text-black/55 mt-1">{issue.status.replaceAll("_", " ")}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </HqCard>

        <HqCard title="Review and publish">
          <p className="text-sm text-black/60 mb-3">
            {publishability.status === "ready"
              ? "Phase 1 DPP requirements met. Publication is allowed."
              : `Not ready: ${publishability.blockers.join("; ")}`}
          </p>
          {record.reviews.length ? (
            <ul className="text-sm text-black/60 mb-3 space-y-1">
              {record.reviews.map((row) => (
                <li key={row.id}>
                  {formatReviewerLine(row.actor, row.created_at)} — {row.title}
                  {row.detail?.includes("reason:")
                    ? ` (${row.detail.slice(row.detail.indexOf("reason:") + 8)})`
                    : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/55 mb-3">No review activity on this product yet.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <ApproveFieldsButton slug={membership.slug} productId={productId} canMutate={canMutate} />
            <PublishPassportButton slug={membership.slug} productId={productId} canMutate={canMutate} />
          </div>
        </HqCard>

        <HqCard title="Passport preview">
          <p className="text-sm text-black/60 mb-2">
            Public fields that would appear on the resolver. Missing values are not invented.
          </p>
          <dl className="text-sm space-y-1">
            <div>
              <dt className="text-black/45">Name</dt>
              <dd>{record.product.name || "—"}</dd>
            </div>
            {record.fields
              .filter((field) => field.access_class === "public")
              .map((field) => (
                <div key={field.id}>
                  <dt className="text-black/45">{field.field_key}</dt>
                  <dd>{field.normalized_value || "—"}</dd>
                </div>
              ))}
          </dl>
          {record.passport ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm">
                State: {passportStateLabel(record.passport.state)}
                {record.passport.versions.length
                  ? ` · ${record.passport.versions.length} published version${record.passport.versions.length === 1 ? "" : "s"}`
                  : ""}
              </p>
              {publicUrl && record.passport.state !== "incomplete" ? (
                <PassportQr url={publicUrl} publicId={record.passport.public_id} />
              ) : null}
              {record.passport.state === "published" || record.passport.state === "update_required" ? (
                <Link className="inline-block text-xs uppercase tracking-wide underline" href={`/p/${record.passport.public_id}`}>
                  Open public passport
                </Link>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-black/55 mt-3">
              No public identity yet. Publishing allocates a stable ID and QR that keep working across
              later versions.
            </p>
          )}
        </HqCard>

        {record.passport?.versions.length ? (
          <HqCard title="Version history">
            <p className="text-sm text-black/55 mb-3">
              Previous published versions are immutable. An update-required passport still serves the
              last published snapshot until you publish again.
            </p>
            <ul className="text-sm space-y-2">
              {record.passport.versions.map((version) => (
                <li key={version.id}>
                  v{version.version_number} · {version.change_summary || version.state} ·{" "}
                  {formatReviewerLine(version.actor, version.published_at || version.created_at)}
                </li>
              ))}
            </ul>
          </HqCard>
        ) : null}
      </div>
    </div>
  );
}
