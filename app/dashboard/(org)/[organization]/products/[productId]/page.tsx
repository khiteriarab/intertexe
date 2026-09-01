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
  EntIssueCompare,
} from "../../../../components/EnterpriseModuleUi";
import {
  EntPageHeader,
  EntPassportPill,
  EntIssuePill,
  entLinkClass,
  entLabelClass,
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
      <div className="ent-float-card px-8 py-10 md:px-10 md:py-12 mb-8">
        <EntPageHeader
          brandLine
          title={String(record.product.name || "Product")}
          description="Source values stay as uploaded. Canonical values are what INTERTEXE publishes after review."
          action={<EntPassportPill state={record.product.passport_state} />}
        />
        {compositionLines.length > 0 ? (
          <div className="mt-8 ent-panel-nested px-6 py-5">
            <p className={entLabelClass}>Composition</p>
            <ul className="mt-3 space-y-1">
              {compositionLines.map((line) => (
                <li key={line} className="text-[17px] md:text-[18px] text-[var(--ent-ink)]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6">
          <HqCard title="Identity">
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
                    ? record.identifiers.map((row) => `${row.identifier_type}:${row.identifier_value}`).join(", ")
                    : "None"}
                </dd>
              </div>
              {record.variants.length ? (
                <div className="sm:col-span-2">
                  <dt className={entLabelClass}>Variants</dt>
                  <dd className="mt-1 text-[var(--ent-ink-soft)]">
                    {record.variants.map((row) => [row.name, row.sku, row.gtin].filter(Boolean).join(" · ")).join("; ")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </HqCard>

          {identifierIssues.length ? (
            <HqCard title="Identifier reconciliation">
              <p className="text-sm text-[var(--ent-muted)] mb-4">
                These source rows share a GTIN, SKU, or style. They were not silently collapsed.
              </p>
              <ul className="space-y-3">
                {identifierIssues.map((issue) => {
                  const ident = parseIdentifierIssueDetail(issue.detail);
                  return (
                    <li key={issue.id} className="ent-panel-nested p-4 text-sm">
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
                        <div className="mt-3">
                          <IssueActions slug={membership.slug} issueId={issue.id} canMutate={canMutate} kind={ident ? "identifier" : "standard"} />
                        </div>
                      ) : ident?.resolution ? (
                        <p className="text-[var(--ent-muted)] mt-2">
                          {ident.resolution.actorName}
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
              <p className="text-sm text-[var(--ent-muted)]">No normalized fields yet.</p>
            ) : (
              <div className="space-y-4">
                {record.fields.map((field) => (
                  <div key={field.id} className="ent-panel-nested p-4 md:p-5">
                    <p className="ent-heading text-[15px] text-[var(--ent-ink)]">{field.field_key}</p>
                    <p className="text-xs text-[var(--ent-muted-light)] mt-1">{field.state}</p>
                    {field.original_value && field.normalized_value && field.original_value !== field.normalized_value ? (
                      <EntIssueCompare source={field.original_value} interpreted={field.normalized_value} />
                    ) : (
                      <p className="text-sm text-[var(--ent-ink-soft)] mt-3">{field.normalized_value || field.original_value || "—"}</p>
                    )}
                    <p className="text-xs text-[var(--ent-muted)] mt-2">
                      {field.explanation || field.transformation_method || "Copied from source."}
                      {field.reviewer_id ? ` · ${formatReviewerLine(field.reviewer, field.updated_at)}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </HqCard>

          <HqCard title="Source records">
            {record.sourceRecords.length === 0 ? (
              <p className="text-sm text-[var(--ent-muted)]">No immutable source records stored yet.</p>
            ) : (
              <ul className="space-y-3">
                {record.sourceRecords.map((row, index) => (
                  <li key={row.id} className="ent-panel-nested p-4 text-sm">
                    <p className="text-[var(--ent-ink-soft)]">
                      Source {index + 1} · {row.source_system || "upload"} ·{" "}
                      {formatOperatorTime(row.retrieved_at || row.created_at)}
                    </p>
                    {"original_payload" in row && row.original_payload ? (
                      <pre className="ent-code-panel mt-3 text-[11px] p-4 overflow-x-auto whitespace-pre-wrap">
                        {payloadPreview(row.original_payload)}
                      </pre>
                    ) : (
                      <p className={`text-xs ${entLabelClass} mt-2`}>Hash {row.payload_hash.slice(0, 12)}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </HqCard>

          <HqCard title="Issues">
            {record.issues.length === 0 ? (
              <p className="text-sm text-[var(--ent-muted)]">No issues on this product.</p>
            ) : (
              <ul className="space-y-3">
                {record.issues.map((issue) => (
                  <li key={issue.id} className="ent-panel-nested p-4 md:p-5">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <EntIssuePill label={issueTypeLabel(issue.issue_type)} tone="neutral" />
                      {issueBlocksPublish(issue) ? <EntIssuePill label="Blocks publish" tone="attention" /> : null}
                    </div>
                    <p className="ent-heading text-[15px] text-[var(--ent-ink)]">{issue.title}</p>
                    <p className="text-[var(--ent-muted)] mt-1 text-sm">{issueWhyItMatters(issue)}</p>
                    {issue.status === "open" ? (
                      <div className="mt-3 space-y-2">
                        <IssueActions slug={membership.slug} issueId={issue.id} canMutate={canMutate} kind={parseIdentifierIssueDetail(issue.detail) ? "identifier" : "standard"} />
                        {issue.issue_type === "missing_data" ? (
                          <SupplierEvidenceRequestButton slug={membership.slug} issueId={issue.id} issueTitle={issue.title} canMutate={canMutate} />
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--ent-muted)] mt-2">{issue.status.replaceAll("_", " ")}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </HqCard>

          <HqCard title="DPP readiness">
            {readiness ? <DppReadinessPanel report={readiness} /> : (
              <p className="text-sm text-[var(--ent-muted)]">Readiness unavailable until EU DPP foundations are migrated.</p>
            )}
            <div className="mt-4">
              <AccessClassLegend />
            </div>
          </HqCard>

          {record.passport?.versions.length ? (
            <HqCard title="Version history">
              <ul className="text-sm space-y-2">
                {record.passport.versions.map((version) => (
                  <li key={version.id} className="ent-panel-nested px-4 py-3">
                    v{version.version_number} · {version.change_summary || version.state} ·{" "}
                    {formatReviewerLine(version.actor, version.published_at || version.created_at)}
                  </li>
                ))}
              </ul>
            </HqCard>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-8 space-y-6">
          <div className="ent-dark-panel p-6 md:p-8">
            <p className="text-[10px] tracking-[0.14em] uppercase text-white/40 mb-2">Review & publish</p>
            <p className="ent-heading text-xl text-white mb-3">
              {publishability.status === "ready" ? "Ready to publish" : "Not ready yet"}
            </p>
            <p className="text-sm text-white/60 leading-relaxed mb-6">
              {publishability.status === "ready"
                ? "Phase 1 DPP requirements met. Preview public fields, approve, then publish."
                : `Blocking: ${publishability.blockers.join("; ")}`}
            </p>
            <ApproveFieldsButton slug={membership.slug} productId={productId} canMutate={canMutate} />
            <PublishPassportButton slug={membership.slug} productId={productId} canMutate={canMutate} />
          </div>

          <div className="ent-float-card p-6 md:p-8">
            <p className="ent-heading text-lg text-[var(--ent-ink)] mb-3">Passport preview</p>
            <p className="text-sm text-[var(--ent-muted)] mb-4">
              Public fields on the resolver. Missing values are not invented.
            </p>
            <dl className="text-sm space-y-2">
              <div>
                <dt className={entLabelClass}>Name</dt>
                <dd className="text-[var(--ent-ink)]">{record.product.name || "—"}</dd>
              </div>
              {record.fields
                .filter((field) => field.access_class === "public")
                .map((field) => (
                  <div key={field.id}>
                    <dt className={entLabelClass}>{field.field_key}</dt>
                    <dd className="text-[var(--ent-ink-soft)]">{field.normalized_value || "—"}</dd>
                  </div>
                ))}
            </dl>
            {record.passport ? (
              <div className="mt-5 space-y-3">
                <p className="text-sm text-[var(--ent-muted)]">
                  {passportStateLabel(record.passport.state)}
                  {record.passport.versions.length ? ` · ${record.passport.versions.length} version(s)` : ""}
                </p>
                {publicUrl && record.passport.state !== "incomplete" ? (
                  <PassportQr url={publicUrl} publicId={record.passport.public_id} variant="collapsible" compact />
                ) : null}
                {record.passport.state === "published" || record.passport.state === "update_required" ? (
                  <Link className={entLinkClass} href={`/p/${record.passport.public_id}`}>
                    Open public passport →
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[var(--ent-muted)] mt-4">
                No public identity yet. Publishing allocates a stable ID and QR.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
