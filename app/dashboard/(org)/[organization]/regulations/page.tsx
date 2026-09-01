import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { humanizeFieldKey } from "../../../../../lib/enterprise/display-format";
import { loadOrgRegulations } from "../../../../../lib/enterprise/module-queries";
import {
  EntEmptyState,
  EntModulePage,
  EntRequirementCard,
  EntVisualPanel,
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
      description="Readiness against the rulesets INTERTEXE evaluates today. This is not legal certification or EU approval."
      zone="blush"
    >
      {!data.ruleset ? (
        <EntEmptyState
          title="Ruleset unavailable"
          body="The ESPR foundation ruleset is not linked in this environment."
        />
      ) : (
        <>
          <EntVisualPanel tone="cream" title="Readiness summary" subtitle={data.ruleset.frameworkName}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Products evaluated", value: data.gapSummary.productsEvaluated },
                { label: "Ready or published", value: data.gapSummary.readyOrPublished, accent: true },
                { label: "Open missing fields", value: data.gapSummary.openMissingFields },
                { label: "Regulatory issues", value: data.gapSummary.openRegulatoryIssues },
              ].map((item) => (
                <div key={item.label} className="ent-panel-nested px-5 py-6">
                  <p
                    className={`ent-display text-[2.5rem] leading-none tabular-nums ${item.accent ? "text-[var(--ent-forest)]" : "text-[var(--ent-ink)]"}`}
                  >
                    {item.value}
                  </p>
                  <p className="text-sm text-[var(--ent-muted)] mt-2">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="ent-panel-nested px-6 py-5">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
                <p className="text-sm text-[var(--ent-muted)]">Catalog readiness</p>
                <p className="ent-display text-[2rem] leading-none text-[var(--ent-petrol-deep)]">{readyPct}%</p>
              </div>
              <div className="h-3 rounded-full bg-white/70 overflow-hidden ring-1 ring-[var(--ent-border)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${readyPct}%`,
                    background: "linear-gradient(90deg, var(--ent-forest), var(--ent-petrol))",
                  }}
                />
              </div>
            </div>
          </EntVisualPanel>

          <section className="mt-8 mb-10">
            <EntVisualPanel tone="stone" padding="normal" title="Active ruleset">
              <p className="text-[17px] font-medium text-[var(--ent-ink)]">{data.ruleset.versionLabel}</p>
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
            </EntVisualPanel>
          </section>

          <section className="mb-12">
            <h2 className="ent-heading text-[1.85rem] md:text-[2rem] text-[var(--ent-ink)] mb-6">Requirement domains</h2>
            <div className="grid md:grid-cols-2 gap-4">
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

          <EntVisualPanel tone="butter" title="Catalog gaps">
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
          </EntVisualPanel>
        </>
      )}
    </EntModulePage>
  );
}
