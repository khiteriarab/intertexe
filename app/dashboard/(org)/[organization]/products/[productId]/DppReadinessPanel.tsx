import { accessClassLabel } from "../../../../../../lib/enterprise/access-classes";
import type { DppReadinessReport } from "../../../../../../lib/enterprise/dpp-readiness";

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  needs_attention: "Needs attention",
  not_applicable: "Not applicable",
  awaiting_regulation: "Awaiting regulation",
};

export function DppReadinessPanel({ report }: { report: DppReadinessReport }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-black/60">{report.disclaimer}</p>
      <p className="text-xs text-black/45">{report.rulesetLabel}</p>
      <div className="space-y-3">
        {report.domains.map((domain) => (
          <details key={domain.key} className="border border-black/10 rounded-lg p-3">
            <summary className="cursor-pointer text-sm font-medium flex flex-wrap items-center gap-2">
              <span>{domain.label}</span>
              <span className="text-[10px] uppercase tracking-wide border border-black/15 px-2 py-0.5">
                {STATUS_LABEL[domain.status] || domain.status}
              </span>
            </summary>
            <p className="text-xs text-black/55 mt-2">{domain.summary}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {domain.items.map((item) => (
                <li key={`${domain.key}-${item.label}`} className="border-t border-black/5 pt-2">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-black/55 text-xs">
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
    <p className="text-xs text-black/45">
      Access classes enforced server-side:{" "}
      {["public", "economic_operator", "supply_chain", "repair_recycling", "authority", "restricted", "internal"]
        .map((row) => accessClassLabel(row))
        .join(" · ")}
    </p>
  );
}
