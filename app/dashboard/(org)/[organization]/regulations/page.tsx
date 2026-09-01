import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { humanizeFieldKey } from "../../../../../lib/enterprise/display-format";
import { loadOrgRegulations } from "../../../../../lib/enterprise/module-queries";
import {
  EntEmptyState,
  EntModulePage,
  EntRequirementCard,
  entLinkClass,
  entLabelClass,
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
  const evaluated = data.gapSummary.productsEvaluated;
  const readyPct = evaluated > 0 ? Math.round((data.gapSummary.readyOrPublished / evaluated) * 100) : 0;

  return (
    <EntModulePage
      title="Regulations"
      meta={
        <>
          <span>
            <strong>{readyPct}%</strong> catalog readiness
          </span>
          <span>
            <strong>{data.gapSummary.openMissingFields}</strong> missing fields
          </span>
          <span>
            <strong>{data.gapSummary.openRegulatoryIssues}</strong> regulatory issues
          </span>
        </>
      }
    >
      {!data.ruleset ? (
        <EntEmptyState
          title="Ruleset unavailable"
          body="The ESPR foundation ruleset is not linked in this environment."
        />
      ) : (
        <>
          <section className="mb-10 pb-8 border-b border-[var(--ent-border)]">
            <h2 className="ent-serif text-[1.35rem] text-[var(--ent-ink)] mb-2">Readiness summary</h2>
            <p className="text-sm text-[var(--ent-muted)] mb-5">{data.ruleset.frameworkName}</p>
            <div className="flex flex-wrap gap-x-8 gap-y-3 mb-6 text-sm">
              <span><strong className="text-[var(--ent-ink)]">{data.gapSummary.productsEvaluated}</strong> products evaluated</span>
              <span><strong className="text-[var(--ent-forest)]">{data.gapSummary.readyOrPublished}</strong> ready or published</span>
              <span><strong className="text-[var(--ent-ink)]">{data.gapSummary.needsAttention}</strong> need attention</span>
            </div>
            <div className="max-w-xl">
              <div className="flex items-end justify-between gap-4 mb-2">
                <p className="text-sm text-[var(--ent-muted)]">Catalog readiness</p>
                <p className="ent-display text-[1.75rem] leading-none text-[var(--ent-petrol-deep)]">{readyPct}%</p>
              </div>
              <div className="h-2.5 rounded-full bg-[var(--ent-surface-muted)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${readyPct}%`,
                    background: "linear-gradient(90deg, var(--ent-forest), var(--ent-petrol))",
                  }}
                />
              </div>
            </div>
          </section>

          <section className="mb-10 pb-8 border-b border-[var(--ent-border)]">
            <h2 className="ent-serif text-[1.35rem] text-[var(--ent-ink)] mb-2">Active ruleset</h2>
            <p className="text-[17px] font-medium text-[var(--ent-ink)] mt-4">{data.ruleset.versionLabel}</p>
            <p className="text-sm text-[var(--ent-muted)] mt-2">
              Effective {data.ruleset.effectiveDate} · {data.ruleset.status}
            </p>
            {data.ruleset.notes ? (
              <p className="text-sm leading-relaxed text-[var(--ent-ink-soft)] mt-4 max-w-2xl">{data.ruleset.notes}</p>
            ) : null}
            {data.ruleset.sourceUrl ? (
              <a href={data.ruleset.sourceUrl} className={`${entLinkClass} mt-4 inline-flex`} target="_blank" rel="noreferrer">
                View framework source →
              </a>
            ) : null}
          </section>

          <section className="mb-12">
            <h2 className="ent-serif text-[1.5rem] text-[var(--ent-ink)] mb-6">Requirement domains</h2>
            <div className="max-w-3xl">
              {data.requirements.map((req) => {
                const technicalKey = req.requirement_key || req.field_key || "";
                return (
                  <EntRequirementCard
                    key={technicalKey}
                    title={humanizeFieldKey(technicalKey)}
                    technicalKey={technicalKey}
                    severity={req.severity}
                    meta={[req.authoritative_source || "INTERTEXE evaluation", req.obligation_kind?.replaceAll("_", " ")]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                );
              })}
            </div>
          </section>

          <section className="pt-2">
            <h2 className="ent-serif text-[1.35rem] text-[var(--ent-ink)] mb-2">Catalog gaps</h2>
            <p className="text-sm text-[var(--ent-muted)] mb-5 max-w-xl">
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
          </section>
        </>
      )}
    </EntModulePage>
  );
}
