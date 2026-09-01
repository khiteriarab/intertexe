import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgRegulations } from "../../../../../lib/enterprise/module-queries";
import {
  EntEmptyState,
  EntModuleMetrics,
  EntModulePage,
  EntModuleSection,
  entLabelClass,
  entLinkClass,
} from "../../../components/EnterpriseModuleUi";

export const dynamic = "force-dynamic";

export default async function RegulationsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const data = await loadOrgRegulations(client, membership.organizationId);
  const base = `/dashboard/${membership.slug}`;

  return (
    <EntModulePage
      title="Regulations"
      description="Readiness against the rulesets INTERTEXE evaluates today. This is not legal certification or EU approval."
    >
      {!data.ruleset ? (
        <EntEmptyState
          title="Ruleset unavailable"
          body="The ESPR foundation ruleset is not linked in this environment."
        />
      ) : (
        <>
          <EntModuleMetrics
            items={[
              { label: "Products evaluated", value: data.gapSummary.productsEvaluated },
              { label: "Ready or published", value: data.gapSummary.readyOrPublished },
              { label: "Open missing fields", value: data.gapSummary.openMissingFields },
              { label: "Open regulatory issues", value: data.gapSummary.openRegulatoryIssues },
            ]}
          />

          <EntModuleSection title="Active ruleset">
            <div className="max-w-2xl space-y-3">
              <p className="text-[17px] font-medium text-[var(--ent-ink)]">{data.ruleset.frameworkName}</p>
              <p className="text-sm text-[var(--ent-muted)]">
                {data.ruleset.versionLabel} · Effective {data.ruleset.effectiveDate} · {data.ruleset.status}
              </p>
              {data.ruleset.notes ? (
                <p className="text-sm leading-relaxed text-[var(--ent-ink-soft)]">{data.ruleset.notes}</p>
              ) : null}
              {data.ruleset.sourceUrl ? (
                <a href={data.ruleset.sourceUrl} className={entLinkClass} target="_blank" rel="noreferrer">
                  View framework source →
                </a>
              ) : null}
            </div>
          </EntModuleSection>

          <EntModuleSection title="Requirement domains">
            <ul className="divide-y divide-[var(--ent-border)]">
              {data.requirements.map((req) => (
                <li key={req.requirement_key || req.field_key} className="py-4">
                  <p className="text-[15px] font-medium text-[var(--ent-ink)]">
                    {req.requirement_key || req.field_key}
                  </p>
                  <p className="text-sm text-[var(--ent-muted)] mt-1">
                    {req.authoritative_source || "INTERTEXE evaluation"} · {req.obligation_kind?.replaceAll("_", " ")}
                    {req.severity ? ` · ${req.severity}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </EntModuleSection>

          <EntModuleSection title="Catalog gaps">
            <p className="text-sm text-[var(--ent-muted)] mb-4">
              {data.gapSummary.needsAttention} product{data.gapSummary.needsAttention === 1 ? "" : "s"} still need
              attention before passport readiness.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={`${base}/issues`} className={entLinkClass}>
                Review issues →
              </Link>
              <Link href={`${base}/products`} className={entLinkClass}>
                Review products →
              </Link>
            </div>
            <p className={`${entLabelClass} mt-8 max-w-xl`}>
              INTERTEXE evaluates readiness against configured rulesets. Textile delegated-act obligations marked
              awaiting rule are not treated as final compliance requirements.
            </p>
          </EntModuleSection>
        </>
      )}
    </EntModulePage>
  );
}
