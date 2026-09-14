import Link from "next/link";
import type { OperationsDashboardData } from "../../../../../lib/enterprise/operations-dashboard";
import { formatRelativeActivityTime, parseActivityFeedLine } from "../../../../../lib/enterprise/display-format";
import { ENT_NAV_ITEM_ICONS } from "../../../components/EnterpriseNavIcons";
import { entButtonClass, entLinkClass } from "../../../components/EnterpriseUi";

type Props = {
  data: OperationsDashboardData;
  slug: string;
  plan: string;
};

function KpiCard({ kpi }: { kpi: OperationsDashboardData["kpis"][number] }) {
  return (
    <Link href={kpi.href} className="ent-ops-kpi-card group">
      <span className="ent-ops-kpi-icon" aria-hidden>
        {kpi.icon}
      </span>
      <p className="ent-ops-kpi-value">{kpi.value}</p>
      <p className="ent-ops-kpi-label">{kpi.label}</p>
      <p className="ent-ops-kpi-hint">{kpi.hint}</p>
      {kpi.trend ? <p className="ent-ops-kpi-trend">{kpi.trend}</p> : null}
    </Link>
  );
}

function WorkspaceCard({
  title,
  description,
  href,
  lines,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  lines: string[];
  icon: keyof typeof ENT_NAV_ITEM_ICONS;
}) {
  const Icon = ENT_NAV_ITEM_ICONS[icon];
  return (
    <Link href={href} className="ent-ops-workspace-card group">
      <div className="ent-ops-workspace-card-head">
        <span className="ent-ops-workspace-icon">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h3 className="ent-ops-workspace-title">{title}</h3>
          <p className="ent-ops-workspace-desc">{description}</p>
        </div>
      </div>
      <ul className="ent-ops-workspace-stats">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <span className="ent-ops-workspace-cta">Open →</span>
    </Link>
  );
}

export function OperationsDashboard({ data, slug, plan }: Props) {
  const base = `/dashboard/${slug}`;
  const { workspace } = data;

  return (
    <div className="ent-ops-dashboard">
      <header className="ent-ops-header">
        <div className="ent-ops-header-copy">
          <h1 className="ent-serif ent-ops-title">Operations</h1>
          <p className="ent-ops-subtitle">
            Coordinate imports, approvals, supplier evidence, and passport publishing in one operational workspace.
          </p>
        </div>
        <div className="ent-ops-header-meta">
          <span className="ent-ops-env-pill">{plan.replaceAll("_", " ")}</span>
          <Link href={`${base}/workflows`} className={entLinkClass}>
            View workflows →
          </Link>
        </div>
      </header>

      <div className="ent-ops-kpi-row">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="ent-ops-layout">
        <div className="ent-ops-primary">
          <section className="ent-ops-hero">
            <div className="ent-ops-hero-main">
              <p className="ent-ops-eyebrow">Operational workflow</p>
              <h2 className="ent-serif ent-ops-hero-title">From data to action</h2>
              <p className="ent-ops-hero-copy">Turn material data into trusted product passports.</p>

              <ol className="ent-ops-journey">
                {data.journey.map((step, index) => (
                  <li key={step.id} className="ent-ops-journey-item">
                    {index > 0 ? <span className="ent-ops-journey-arrow" aria-hidden>→</span> : null}
                    <Link
                      href={step.href}
                      className={`ent-ops-journey-step ent-ops-journey-step--${step.status}`}
                    >
                      <span className="ent-ops-journey-marker" aria-hidden>
                        {step.status === "complete" ? "✓" : index + 1}
                      </span>
                      <span className="ent-ops-journey-label">{step.label}</span>
                      <span className="ent-ops-journey-desc">{step.description}</span>
                    </Link>
                  </li>
                ))}
              </ol>

              <div className="ent-ops-progress">
                <div className="ent-ops-progress-meta">
                  <span>
                    {data.journeyComplete} of {data.journeyTotal} complete
                  </span>
                  <span>{data.journeyPct}%</span>
                </div>
                <div className="ent-ops-progress-track">
                  <span className="ent-ops-progress-fill" style={{ width: `${data.journeyPct}%` }} />
                </div>
              </div>
            </div>

            <aside className="ent-ops-next">
              <p className="ent-ops-next-eyebrow">Next step</p>
              <h3 className="ent-serif ent-ops-next-title">{data.nextStep.title}</h3>
              <p className="ent-ops-next-body">{data.nextStep.body}</p>
              <Link href={data.nextStep.href} className={`${entButtonClass} ent-ops-next-cta`}>
                {data.nextStep.label}
              </Link>
            </aside>
          </section>

          <section className="ent-ops-workspace-section">
            <div className="ent-ops-section-head">
              <h2 className="ent-serif ent-ops-section-title">Operational workspace</h2>
              <p className="ent-ops-section-sub">Everything you need to keep product data moving.</p>
            </div>
            <div className="ent-ops-workspace-grid">
              <WorkspaceCard
                title="Import Center"
                description="CSV history, row errors, and import replay."
                href={workspace.imports.href}
                icon="files"
                lines={[
                  `${workspace.imports.importsThisWeek} imports this week`,
                  `${workspace.imports.withErrors} with row errors`,
                ]}
              />
              <WorkspaceCard
                title="Approvals"
                description="Field and publish approval requests."
                href={workspace.approvals.href}
                icon="issues"
                lines={[
                  `${workspace.approvals.pending} pending`,
                  `${workspace.approvals.newToday} new today`,
                ]}
              />
              <WorkspaceCard
                title="Suppliers"
                description="Evidence requests and supplier partners."
                href={workspace.suppliers.href}
                icon="suppliers"
                lines={[
                  `${workspace.suppliers.awaitingResponse} awaiting response`,
                  `${workspace.suppliers.activeCount} active suppliers`,
                ]}
              />
              <WorkspaceCard
                title="Files"
                description="Imports, source records, and uploaded assets."
                href={workspace.files.href}
                icon="files"
                lines={[
                  `${workspace.files.sourceRecords} source records`,
                  `${workspace.files.assetsLabel} total assets`,
                ]}
              />
            </div>
          </section>
        </div>

        <aside className="ent-ops-sidebar">
          <section className="ent-ops-panel">
            <div className="ent-ops-panel-head">
              <h2 className="ent-serif ent-ops-panel-title">Recent activity</h2>
              <Link href={`${base}/activity`} className={entLinkClass}>
                View all →
              </Link>
            </div>
            {data.activity.length === 0 ? (
              <p className="ent-ops-empty">No activity recorded yet.</p>
            ) : (
              <ul className="ent-ops-activity">
                {data.activity.map((item) => {
                  const { headline, detail } = parseActivityFeedLine(item.title);
                  const when = formatRelativeActivityTime(item.created_at);
                  return (
                    <li key={item.id} className="ent-ops-activity-row">
                      <span className="ent-ops-activity-icon" aria-hidden>
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="ent-ops-activity-title">{headline}</p>
                        {detail || item.detail ? (
                          <p className="ent-ops-activity-detail">{detail || item.detail}</p>
                        ) : null}
                        {when ? <time className="ent-ops-activity-time">{when}</time> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="ent-ops-panel">
            <h2 className="ent-serif ent-ops-panel-title">Team &amp; queue status</h2>
            <div className="ent-ops-team-avatars">
              {data.team.members.map((member) => (
                <span key={member.id || member.email} className="ent-ops-team-avatar" title={member.name || member.email || "Team member"}>
                  {(member.name || member.email || "?").slice(0, 1).toUpperCase()}
                </span>
              ))}
            </div>
            <ul className="ent-ops-queue">
              <li>
                <strong>{data.team.inProgress}</strong> In progress
              </li>
              <li>
                <strong>{data.team.needsReview}</strong> Needs review
              </li>
              <li>
                <strong>{data.team.readyToPublish}</strong> Ready to publish
              </li>
            </ul>
            <Link href={`${base}/workflows`} className={`${entLinkClass} ent-ops-queue-link`}>
              Manage assignments →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
