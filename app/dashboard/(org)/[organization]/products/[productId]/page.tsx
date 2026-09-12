import Link from "next/link";
import { notFound } from "next/navigation";
import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../../lib/enterprise/access";
import {
  identifierClassLabel,
  parseIdentifierIssueDetail,
} from "../../../../../../lib/enterprise/identity-reconciliation";
import {
  issueBlocksPublish,
  issueTypeLabel,
  issueWhyItMatters,
  passportStateLabel,
} from "../../../../../../lib/enterprise/issue-copy";
import { loadDppReadiness } from "../../../../../../lib/enterprise/dpp-readiness";
import { loadProductGovernanceScore } from "../../../../../../lib/enterprise/governance-score";
import { loadProductImpactReadiness } from "../../../../../../lib/enterprise/impact-readiness";
import { buildProductProvenanceBundle } from "../../../../../../lib/enterprise/provenance";
import { loadOrgProduct } from "../../../../../../lib/enterprise/queries";
import { buildProductJourney } from "../../../../../../lib/enterprise/product-journey";
import { ensurePassportShell, provisionDraftQrCarrier, publicResolverUrl } from "../../../../../../lib/enterprise/carriers";
import { publishabilityForProduct } from "../../../../../../lib/enterprise/publish";
import { loadProductTraceability } from "../../../../../../lib/enterprise/traceability";
import {
  formatOperatorTime,
  formatReviewerLine,
} from "../../../../../../lib/enterprise/reviewer-display";
import { HqCard } from "../../section-frame";
import { EntIssueCompare } from "../../../../components/EnterpriseModuleUi";
import {
  EntPageHeader,
  EntPassportPill,
  EntIssuePill,
  entLinkClass,
  entLabelClass,
} from "../../../../components/EnterpriseUi";
import { GovernanceScorePanel } from "../../../../components/GovernanceScorePanel";
import { ImpactReadinessPanel } from "../../../../components/ImpactReadinessPanel";
import { ProductJourneyMap } from "../../../../components/ProductJourneyMap";
import { ProductRecordShell } from "../../../../components/ProductRecordShell";
import type { ProductRecordTab } from "../../../../components/ProductRecordNav";
import { ProvenanceInline } from "../../../../components/ProvenanceInline";
import { TraceabilityPanel } from "../../../../components/TraceabilityPanel";
import { buildPassportPreviewContent } from "../../../../../../lib/enterprise/passport-preview";
import { loadProductExperienceConfig } from "../../../../../../lib/enterprise/passport-experience";
import { IssueActions } from "../../issues/IssueActions";
import {
  buildFieldRows,
  PassportExperienceDesigner,
} from "../../../../components/PassportExperienceDesigner";
import { PassportPreviewPanel } from "../../../../components/PassportPreviewPanel";
import { PublishPassportButton } from "../../passports/PublishPassportButton";
import { ApproveFieldsButton } from "./ApproveFieldsButton";
import { AccessClassLegend, DppReadinessPanel } from "./DppReadinessPanel";
import { SupplierEvidenceRequestButton } from "./SupplierEvidenceRequestButton";
import { ProductCarriersPanel } from "./ProductCarriersPanel";

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
  searchParams,
}: {
  params: Promise<{ organization: string; productId: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { organization, productId } = await params;
  const query = (await searchParams) || {};
  const tab = (query.tab as ProductRecordTab) || "overview";
  const { membership, client } = await requireOrganizationAccess(organization);
  const record = await loadOrgProduct(client, membership.organizationId, productId);
  if (!record) notFound();
  const canMutate = canMutateEnterprise(membership.role);
  const basePath = `/dashboard/${membership.slug}/products/${productId}`;

  let publishability = await publishabilityForProduct(client, membership.organizationId, productId);

  const hasProductIdentity = Boolean(
    record.product.name && (record.product.sku || record.product.style_code)
  );
  const needsPassportShell = !record.passport?.public_id && !record.identityPublicId;

  if (canMutate && hasProductIdentity && needsPassportShell) {
    try {
      await ensurePassportShell(client, membership.organizationId, productId);
      await provisionDraftQrCarrier(client, membership.organizationId, productId);
      const refreshed = await loadOrgProduct(client, membership.organizationId, productId);
      if (refreshed) Object.assign(record, refreshed);
      publishability = await publishabilityForProduct(client, membership.organizationId, productId);
    } catch {
      // Shell provisioning is best-effort on load
    }
  } else if (canMutate && hasProductIdentity && !(record.passport?.carriers || []).some((c) => c.carrier_type === "qr")) {
    try {
      await provisionDraftQrCarrier(client, membership.organizationId, productId);
      const refreshed = await loadOrgProduct(client, membership.organizationId, productId);
      if (refreshed) Object.assign(record, refreshed);
    } catch {
      // Draft QR provisioning is best-effort on load
    }
  }

  const [traceability, governance, supplierRequests, experienceConfig] = await Promise.all([
    loadProductTraceability(client, membership.organizationId, productId, record.fields),
    loadProductGovernanceScore(client, membership.organizationId, productId),
    client
      .from("supplier_requests")
      .select("id, title, status, collaboration_status, due_at, request_kind")
      .eq("organization_id", membership.organizationId)
      .eq("product_id", productId)
      .order("created_at", { ascending: false }),
    loadProductExperienceConfig(client, membership.organizationId, productId),
  ]);
  const impactReadiness = await loadProductImpactReadiness(
    client,
    membership.organizationId,
    productId,
    traceability.knownTierCount
  );

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
  const effectivePublicId = record.passport?.public_id || record.identityPublicId || null;
  const journey = buildProductJourney(record, origin);
  const provenance = buildProductProvenanceBundle(record.fields, record.sourceRecords);
  const publicUrl = effectivePublicId
    ? record.passport?.publicUrl?.startsWith("http")
      ? record.passport.publicUrl
      : publicResolverUrl(effectivePublicId)
    : null;
  const previewContent = buildPassportPreviewContent({
    product: record.product,
    fields: record.fields,
    traceability,
    passport: record.passport,
  });
  const isPublished =
    record.passport?.state === "published" || record.passport?.state === "update_required";

  const showOverview = tab === "overview";
  const showMaterials = tab === "materials" || tab === "overview";
  const showTraceability = tab === "traceability" || tab === "overview";
  const showSuppliers = tab === "suppliers";
  const showImpact = tab === "impact" || tab === "overview";
  const showPassport = tab === "passport";
  const showHistory = tab === "history";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <EntPageHeader
          brandLine
          title={String(record.product.name || "Product")}
          description="Governed product record — identity, traceability, evidence, impact readiness, passport."
        />
        <EntPassportPill state={record.product.passport_state} />
      </div>

      <ProductRecordShell basePath={basePath}>
        {showOverview ? (
          <>
            <ProductJourneyMap journey={journey} />
            <div className="mb-6">
              <GovernanceScorePanel score={governance} />
            </div>
          </>
        ) : null}

        {showPassport ? (
          <div className="space-y-6">
            <div className="ent-review-panel max-w-3xl">
              <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--ent-muted-light)] mb-2">Review & publish</p>
              <p className="ent-heading text-xl text-[var(--ent-ink)] mb-3">
                {publishability.status === "ready"
                  ? "Ready to publish"
                  : effectivePublicId
                    ? "Preview ready"
                    : "Not ready yet"}
              </p>
              <p className="text-sm text-[var(--ent-muted)] leading-relaxed mb-6">
                {publishability.status === "ready"
                  ? "Phase 1 DPP requirements met. Publish to activate the live resolver and QR carrier."
                  : effectivePublicId
                    ? `Scan the preview QR — it opens /p/${effectivePublicId}. Resolve blockers to publish: ${publishability.blockers.join("; ")}`
                    : `Blocking: ${publishability.blockers.join("; ")}`}
              </p>
              <ApproveFieldsButton slug={membership.slug} productId={productId} canMutate={canMutate} />
              <PublishPassportButton
                slug={membership.slug}
                productId={productId}
                canMutate={canMutate}
                publishReady={publishability.status === "ready"}
              />
            </div>
            <PassportExperienceDesigner
              slug={membership.slug}
              productId={productId}
              canMutate={canMutate}
              publishReady={publishability.status === "ready"}
              published={isPublished}
              publicId={effectivePublicId}
              absoluteUrl={publicUrl}
              carriers={(record.passport?.carriers as any[]) || []}
              experience={experienceConfig}
              content={previewContent}
              fields={buildFieldRows(record.fields)}
              versionNumber={record.passport?.versions.at(-1)?.version_number}
            />
            <ProductCarriersPanel
              slug={membership.slug}
              productId={productId}
              canMutate={canMutate}
              carriers={(record.passport?.carriers as any[]) || []}
              publishReady={publishability.status === "ready"}
              absoluteUrl={publicUrl}
              publicId={effectivePublicId}
            />
          </div>
        ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-6">
            {(showOverview || tab === "materials") && (
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
                </dl>
              </HqCard>
            )}

            {showMaterials ? (
              <HqCard title="Materials & provenance">
                {provenance.length === 0 ? (
                  <p className="text-sm text-[var(--ent-muted)]">No governed material fields yet.</p>
                ) : (
                  <div className="space-y-4">
                    {provenance.map((row) => (
                      <ProvenanceInline key={row.fieldKey} provenance={row} />
                    ))}
                  </div>
                )}
              </HqCard>
            ) : null}

            {showTraceability ? (
              <HqCard title="Traceability">
                <TraceabilityPanel traceability={traceability} />
              </HqCard>
            ) : null}

            {showSuppliers ? (
              <HqCard title="Supplier collaboration">
                {(supplierRequests.data || []).length === 0 ? (
                  <p className="text-sm text-[var(--ent-muted)]">
                    No supplier requests for this product. Request evidence from an open issue.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {(supplierRequests.data || []).map((req) => (
                      <li key={req.id} className="ent-panel-nested p-4 text-sm">
                        <p className="font-medium text-[var(--ent-ink)]">{req.title || "Supplier request"}</p>
                        <p className="text-[var(--ent-muted)] mt-1">
                          {req.request_kind || "evidence"} · {req.collaboration_status || req.status}
                          {req.due_at ? ` · due ${formatOperatorTime(req.due_at)}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </HqCard>
            ) : null}

            {showImpact ? (
              <HqCard title="Impact readiness">
                <ImpactReadinessPanel report={impactReadiness} />
              </HqCard>
            ) : null}

            {showOverview && identifierIssues.length ? (
              <HqCard title="Identifier reconciliation">
                <ul className="space-y-3">
                  {identifierIssues.map((issue) => {
                    const ident = parseIdentifierIssueDetail(issue.detail);
                    return (
                      <li key={issue.id} className="ent-panel-nested p-4 text-sm">
                        <p className="font-medium text-[var(--ent-ink)]">
                          {ident ? identifierClassLabel(ident.classification) : issue.title}
                        </p>
                        {issue.status === "open" ? (
                          <div className="mt-3">
                            <IssueActions slug={membership.slug} issueId={issue.id} canMutate={canMutate} kind={ident ? "identifier" : "standard"} />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </HqCard>
            ) : null}

            {(showOverview || showHistory) && (
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
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </HqCard>
            )}

            {showHistory ? (
              <>
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
                        </li>
                      ))}
                    </ul>
                  )}
                </HqCard>
                {record.passport?.versions.length ? (
                  <HqCard title="Version history">
                    <ul className="text-sm space-y-2">
                      {record.passport.versions.map((version) => (
                        <li key={version.id} className="ent-panel-nested px-4 py-3">
                          v{version.version_number} · {formatReviewerLine(version.actor, version.published_at || version.created_at)}
                        </li>
                      ))}
                    </ul>
                  </HqCard>
                ) : null}
              </>
            ) : null}

            {showOverview ? (
              <HqCard title="DPP & regulatory readiness">
                {readiness ? <DppReadinessPanel report={readiness} /> : (
                  <p className="text-sm text-[var(--ent-muted)]">Readiness unavailable until EU DPP foundations are migrated.</p>
                )}
                <div className="mt-4">
                  <AccessClassLegend />
                </div>
              </HqCard>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-8 space-y-6">
            <div className="ent-review-panel">
              <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--ent-muted-light)] mb-2">Review & publish</p>
              <p className="ent-heading text-xl text-[var(--ent-ink)] mb-3">
                {publishability.status === "ready"
                  ? "Ready to publish"
                  : effectivePublicId
                    ? "Preview ready"
                    : "Not ready yet"}
              </p>
              <p className="text-sm text-[var(--ent-muted)] leading-relaxed mb-6">
                {publishability.status === "ready"
                  ? "Phase 1 DPP requirements met. Preview public fields, approve, then publish."
                  : effectivePublicId
                    ? `Preview QR is live at ${effectivePublicId}. Resolve blockers to publish: ${publishability.blockers.join("; ")}`
                    : `Blocking: ${publishability.blockers.join("; ")}`}
              </p>
              <ApproveFieldsButton slug={membership.slug} productId={productId} canMutate={canMutate} />
              <PublishPassportButton
                slug={membership.slug}
                productId={productId}
                canMutate={canMutate}
                publishReady={publishability.status === "ready"}
              />
            </div>

            {showOverview && (
              <PassportPreviewPanel
                content={previewContent}
                publicId={effectivePublicId}
                absoluteUrl={publicUrl}
                versionNumber={record.passport?.versions.at(-1)?.version_number}
                published={isPublished}
              />
            )}

            {showOverview && (
              <ProductCarriersPanel
                slug={membership.slug}
                productId={productId}
                canMutate={canMutate}
                carriers={(record.passport?.carriers as any[]) || []}
                publishReady={publishability.status === "ready"}
                absoluteUrl={publicUrl}
                publicId={effectivePublicId}
              />
            )}
          </aside>
        </div>
        )}
      </ProductRecordShell>
    </div>
  );
}
