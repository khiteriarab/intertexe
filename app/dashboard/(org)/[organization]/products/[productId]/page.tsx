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
import { formatCompositionLines } from "../../../../../../lib/enterprise/display-format";
import { loadDppReadiness } from "../../../../../../lib/enterprise/dpp-readiness";
import { loadOrgProduct } from "../../../../../../lib/enterprise/queries";
import { publishabilityForProduct } from "../../../../../../lib/enterprise/publish";
import {
  formatOperatorTime,
  formatReviewerLine,
} from "../../../../../../lib/enterprise/reviewer-display";
import { HqCard } from "../../section-frame";
import {
  EntPageHeader,
  EntPassportPill,
  EntIssuePill,
  entLinkClass,
  entLabelClass,
  entMetaClass,
} from "../../../../components/EnterpriseUi";
import { IssueActions } from "../../issues/IssueActions";
import { PassportQr } from "../../passports/PassportQr";
import { PublishPassportButton } from "../../passports/PublishPassportButton";
import { ApproveFieldsButton } from "./ApproveFieldsButton";
import { AccessClassLegend, DppReadinessPanel } from "./DppReadinessPanel";
import { SupplierEvidenceRequestButton } from "./SupplierEvidenceRequestButton";

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
  let readiness = null;
  try {
    readiness = await loadDppReadiness(client, membership.organizationId, productId);
  } catch {
    readiness = null;
  }
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
  const compositionField = record.fields.find((f) => f.field_key === "composition");
  const compositionLines = formatCompositionLines(
    compositionField?.normalized_value || compositionField?.original_value || null
  );

  return (
    <div>
      <EntPageHeader
        brandLine
        title={String(record.product.name || "Product")}
        description="Source values stay as uploaded. Canonical values are what INTERTEXE will publish after you review them."
        action={<EntPassportPill state={record.product.passport_state} />}
      />

      {compositionLines.length > 0 ? (
        <div className="mb-8 pb-8 border-b border-[var(--ent-border)]">
          <p className={entLabelClass}>Composition</p>
          <ul className="mt-3 space-y-1">
            {compositionLines.map((line) => (
              <li key={line} className="text-[17px] md:text-[19px] text-[var(--ent-ink)]">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-sm text-[var(--ent-muted)] mb-8">
        {publishability.status === "ready"
          ? "Nothing is blocking a passport. Preview the public fields, then publish."
          : `Blocking this passport: ${publishability.blockers.join("; ")}.`}
      </p>
      <div className="space-y-10 md:space-y-12">
        <HqCard title="Identity" variant="open" padding="none">
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
            <div>
              <dt className={entLabelClass}>SKU</dt>
              <dd className="mt-1 text-[var(--ent-ink)]">{record.product.sku || "—"}</dd>
            </div>
            <div>
              <dt className={entLabelClass}>Style</dt>
              <dd className="mt-1 text-[var(--ent-ink)]">{record.product.style_code || "—"}</dd>
            </div>
            <div>
              <dt className={entLabelClass}>Category</dt>
              <dd className="mt-1 text-[var(--ent-ink)]">{record.product.category || "—"}</dd>
            </div>
            <div>
              <dt className={entLabelClass}>Identifiers</dt>
              <dd className="mt-1 text-[var(--ent-ink-soft)]">
                {record.identifiers.length
                  ? record.identifiers
                      .map((row) => `${row.identifier_type}:${row.identifier_value}`)
                      .join(", ")
                  : "None"}
              </dd>
            </div>
            {record.variants.length ? (
              <div className="sm:col-span-2">
                <dt className={entLabelClass}>Variants</dt>
                <dd className="mt-1 text-[var(--ent-ink-soft)]">
                  {record.variants
                    .map((row) => [row.name, row.sku, row.gtin].filter(Boolean).join(" · "))
                    .join("; ")}
                </dd>
              </div>
            ) : null}
          </dl>
        </HqCard>

        {identifierIssues.length ? (
          <HqCard title="Identifier reconciliation" variant="open" padding="none">
            <p className="text-sm text-[var(--ent-muted)] mb-4">
              These source rows share a GTIN, SKU, or style. They were not silently collapsed.
              Source files remain unchanged.
            </p>
            <ul className="space-y-3">
              {identifierIssues.map((issue) => {
                const ident = parseIdentifierIssueDetail(issue.detail);
                return (
                  <li key={issue.id} className="text-sm py-4 border-t border-[var(--ent-border)] first:border-0 first:pt-0">
                    <p className="font-medium text-[var(--ent-ink)]">
                      {ident ? identifierClassLabel(ident.classification) : issue.title}
                    </p>
                    {ident ? (
                      <p className="text-[var(--ent-muted)] mt-1">
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
                      <p className="text-[var(--ent-muted)] mt-2">
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

        <HqCard title="Source vs canonical" variant="open" padding="none">
          {record.fields.length === 0 ? (
            <p className="text-sm text-[var(--ent-muted)]">No normalized fields yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] tracking-[0.06em] text-[var(--ent-muted-light)] border-b border-[var(--ent-border)]">
                    {["Field", "Source (original)", "Canonical", "State", "Why / provenance", "Reviewer"].map(
                      (col) => (
                        <th key={col} className="pr-4 py-3 font-medium">
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {record.fields.map((field) => (
                    <tr key={field.id} className="border-b border-[var(--ent-border)] align-top last:border-0">
                      <td className="pr-4 py-3 text-[var(--ent-ink)]">{field.field_key}</td>
                      <td className="pr-4 py-3 text-[var(--ent-ink-soft)]">{field.original_value || "—"}</td>
                      <td className="pr-4 py-3 text-[var(--ent-ink)]">{field.normalized_value || "—"}</td>
                      <td className="pr-4 py-3 text-[var(--ent-muted)]">{field.state}</td>
                      <td className="pr-4 py-3 text-xs text-[var(--ent-muted)] max-w-sm">
                        {field.explanation || field.transformation_method || "Copied from source."}
                      </td>
                      <td className="pr-4 py-3 text-xs text-[var(--ent-muted)]">
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

        <HqCard title="Source records" variant="open" padding="none">
          {record.sourceRecords.length === 0 ? (
            <p className="text-sm text-[var(--ent-muted)]">No immutable source records stored yet.</p>
          ) : (
            <ul className="text-sm space-y-3">
              {record.sourceRecords.map((row, index) => (
                <li key={row.id} className="py-4 border-t border-[var(--ent-border)] first:border-0">
                  <p>
                    Source {index + 1} · {row.source_system || "upload"} ·{" "}
                    {formatOperatorTime(row.retrieved_at || row.created_at)}
                  </p>
                  {"original_payload" in row && row.original_payload ? (
                    <pre className="mt-2 text-[11px] bg-[#f6f5f3] p-2 overflow-x-auto whitespace-pre-wrap">
                      {payloadPreview(row.original_payload)}
                    </pre>
                  ) : (
                    <p className="text-xs entLabelClass mt-1">Original payload stored; hash {row.payload_hash.slice(0, 12)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </HqCard>

        <HqCard title="Issues" variant="open" padding="none">
          {record.issues.length === 0 ? (
            <p className="text-sm text-[var(--ent-muted)]">No issues on this product.</p>
          ) : (
            <ul className="text-sm space-y-3">
              {record.issues.map((issue) => (
                <li key={issue.id} className="py-5 border-t border-[var(--ent-border)] first:border-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <EntIssuePill label={issueTypeLabel(issue.issue_type)} tone="neutral" />
                    {issueBlocksPublish(issue) ? (
                      <EntIssuePill label="Blocks publish" tone="attention" />
                    ) : null}
                  </div>
                  <p className="font-medium text-[var(--ent-ink)]">{issue.title}</p>
                  <p className="text-[var(--ent-muted)] mt-1">{issueWhyItMatters(issue)}</p>
                  <p className="text-xs entLabelClass mt-1">
                    {issueBlocksPublish(issue) ? "Blocks publish" : "Does not block publish"} ·{" "}
                    {issueRecommendedAction(issue)}
                  </p>
                  {issue.status === "open" ? (
                    <div className="mt-2 space-y-2">
                      <IssueActions
                        slug={membership.slug}
                        issueId={issue.id}
                        canMutate={canMutate}
                        kind={parseIdentifierIssueDetail(issue.detail) ? "identifier" : "standard"}
                      />
                      {issue.issue_type === "missing_data" ? (
                        <SupplierEvidenceRequestButton
                          slug={membership.slug}
                          issueId={issue.id}
                          issueTitle={issue.title}
                          canMutate={canMutate}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-[var(--ent-muted)] mt-1">{issue.status.replaceAll("_", " ")}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </HqCard>

        <HqCard title="DPP readiness" variant="open" padding="none">
          {readiness ? <DppReadinessPanel report={readiness} /> : (
            <p className="text-sm text-[var(--ent-muted)]">Readiness unavailable until EU DPP foundations are migrated.</p>
          )}
          <div className="mt-3">
            <AccessClassLegend />
          </div>
        </HqCard>

        <HqCard title="Review and publish" variant="open" padding="none">
          <p className="text-sm text-[var(--ent-muted)] mb-3">
            {publishability.status === "ready"
              ? "Phase 1 DPP requirements met. Publication is allowed."
              : `Not ready: ${publishability.blockers.join("; ")}`}
          </p>
          {record.reviews.length ? (
            <ul className="text-sm text-[var(--ent-muted)] mb-3 space-y-1">
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
            <p className="text-sm text-[var(--ent-muted)] mb-3">No review activity on this product yet.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <ApproveFieldsButton slug={membership.slug} productId={productId} canMutate={canMutate} />
            <PublishPassportButton slug={membership.slug} productId={productId} canMutate={canMutate} />
          </div>
        </HqCard>

        <HqCard title="Passport preview" variant="open" padding="none">
          <p className="text-sm text-[var(--ent-muted)] mb-2">
            Public fields that would appear on the resolver. Missing values are not invented.
          </p>
          <dl className="text-sm space-y-1">
            <div>
              <dt className={entLabelClass}>Name</dt>
              <dd>{record.product.name || "—"}</dd>
            </div>
            {record.fields
              .filter((field) => field.access_class === "public")
              .map((field) => (
                <div key={field.id}>
                  <dt className={entLabelClass}>{field.field_key}</dt>
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
                <PassportQr url={publicUrl} publicId={record.passport.public_id} variant="collapsible" />
              ) : null}
              {record.passport.state === "published" || record.passport.state === "update_required" ? (
                <Link className={`${entLinkClass} mt-3 inline-block`} href={`/p/${record.passport.public_id}`}>
                  Open public passport →
                </Link>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--ent-muted)] mt-3">
              No public identity yet. Publishing allocates a stable ID and QR that keep working across
              later versions.
            </p>
          )}
        </HqCard>

        {record.passport?.versions.length ? (
          <HqCard title="Version history" variant="open" padding="none">
            <p className="text-sm text-[var(--ent-muted)] mb-3">
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
