import { accessClassLabel } from "../../../../../../lib/enterprise/access-classes";
import type { DppReadinessReport } from "../../../../../../lib/enterprise/dpp-readiness";
import { EntProgressRing } from "../../../../components/EnterpriseCharts";
import { entLabelClass, entMetaClass } from "../../../../components/EnterpriseUi";

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  needs_attention: "Needs attention",
  not_applicable: "Not applicable",
  awaiting_regulation: "Awaiting regulation",
};

const STATUS_TONE: Record<string, string> = {
  ready: "bg-[#E4EDEA] text-[var(--ent-forest)]",
  needs_attention: "bg-[var(--ent-raspberry-soft)] text-[var(--ent-raspberry)]",
  not_applicable: "bg-[var(--ent-surface-muted)] text-[var(--ent-muted)]",
  awaiting_regulation: "bg-[var(--ent-butter-soft)] text-[var(--ent-ink-soft)]",
};

export function DppReadinessPanel({ report }: { report: DppReadinessReport }) {
  const readyCount = report.domains.filter((d) => d.status === "ready").length;
  const pct = report.domains.length ? Math.round((readyCount / report.domains.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6">
        <EntProgressRing value={pct} label="Domains ready" size={110} accent="#42666c" />
        <div className="flex-1 min-w-[12rem]">
          <p className="text-sm text-[var(--ent-muted)] leading-relaxed">{report.disclaimer}</p>
          <p className={`${entMetaClass} mt-2`}>{report.rulesetLabel}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {report.domains.map((domain) => (
          <details key={domain.key} className="ent-panel-nested p-4 md:p-5 group">
            <summary className="cursor-pointer list-none flex flex-wrap items-center gap-2">
              <span className="ent-heading text-[15px] text-[var(--ent-ink)]">{domain.label}</span>
              <span className={`text-[10px] uppercase tracking-wide rounded-full px-2.5 py-0.5 ${STATUS_TONE[domain.status] || STATUS_TONE.not_applicable}`}>
                {STATUS_LABEL[domain.status] || domain.status}
              </span>
            </summary>
            <p className="text-sm text-[var(--ent-muted)] mt-3">{domain.summary}</p>
            <ul className="mt-3 space-y-2">
              {domain.items.map((item) => (
                <li key={`${domain.key}-${item.label}`} className="text-sm border-t border-[var(--ent-border)] pt-2 first:border-0 first:pt-0">
                  <p className="font-medium text-[var(--ent-ink-soft)]">{item.label}</p>
                  <p className={`${entMetaClass} mt-0.5`}>
                    {item.status} · {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

export function AccessClassLegend() {
  return (
    <p className={`${entMetaClass}`}>
      Access classes enforced server-side:{" "}
      {["public", "economic_operator", "supply_chain", "repair_recycling", "authority", "restricted", "internal"]
        .map((row) => accessClassLabel(row))
        .join(" · ")}
    </p>
  );
}
