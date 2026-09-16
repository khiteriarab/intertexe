import Link from "next/link";
import type { CatalogCompositionStats } from "../../../lib/enterprise/composition-benchmark";
import type { ConsumerSignalsBundle } from "../../../lib/enterprise/consumer-signals";
import { padCount } from "../../../lib/enterprise/display-format";
import { passportStateLabel } from "../../../lib/enterprise/issue-copy";
import type { OrgOverviewData } from "../../../lib/enterprise/queries";
import { EntDonutChart, LIFECYCLE_COLORS } from "./EnterpriseCharts";
import { EntActivityFeed } from "./EnterpriseUi";
import { ImpactLcaBars } from "./ImpactLcaBars";

export function EntDashboardHome({
  overview,
  stats,
  signals,
  base,
  orgName,
}: {
  overview: OrgOverviewData;
  stats: CatalogCompositionStats;
  signals: ConsumerSignalsBundle;
  base: string;
  orgName: string;
}) {
  const total = overview.productCount;
  const passportReady = overview.readyCount + overview.publishedCount;
  const readinessPct = total > 0 ? Math.round((passportReady / total) * 100) : 0;
  const reviewCount = overview.productStateCounts.review_required || 0;
  const incompleteCount = overview.productStateCounts.incomplete || 0;

  const lifecycleSegments = [
    { key: "published", label: passportStateLabel("published"), value: overview.productStateCounts.published || 0, color: LIFECYCLE_COLORS.published },
    { key: "ready", label: passportStateLabel("ready"), value: overview.productStateCounts.ready || 0, color: LIFECYCLE_COLORS.ready },
    { key: "review_required", label: passportStateLabel("review_required"), value: overview.productStateCounts.review_required || 0, color: LIFECYCLE_COLORS.review_required },
    { key: "incomplete", label: passportStateLabel("incomplete"), value: overview.productStateCounts.incomplete || 0, color: LIFECYCLE_COLORS.incomplete },
    { key: "update_required", label: passportStateLabel("update_required"), value: overview.productStateCounts.update_required || 0, color: LIFECYCLE_COLORS.update_required },
  ].filter((segment) => segment.value > 0);

  const attention = [
    { label: "Open issues", count: overview.issueCount, href: `${base}/issues`, emphasis: overview.issueCount > 0 },
    { label: "Missing fields", count: overview.missingCount, href: `${base}/issues` },
    { label: "Needs review", count: reviewCount, href: `${base}/approvals` },
    { label: "Incomplete records", count: incompleteCount, href: `${base}/products` },
  ].filter((item) => item.count > 0);

  const next =
    overview.issueCount > 0
      ? { title: "Resolve open issues", body: "Clear blocking data gaps so passports can move to ready.", href: `${base}/issues`, label: "Open issues" }
      : reviewCount > 0
        ? { title: "Review pending records", body: "Approve identity and evidence so products can publish.", href: `${base}/approvals`, label: "Open approvals" }
        : overview.readyCount > 0
          ? { title: "Publish ready passports", body: "Products already meet Phase 1 requirements.", href: `${base}/passports`, label: "Open passports" }
          : { title: "Import catalog", body: "Bring products in to start governed records.", href: `${base}/products`, label: "Open products" };

  const envSegments = stats.fiberRows.slice(0, 7).map((row) => ({
    stage: row.fiberCode,
    label: row.label,
    sharePct: row.sharePct,
    color: row.color,
  }));

  const signalLead = signals.insights[0];

  return (
    <div className="ent-dash-home">
      <header className="ent-dash-home-header">
        <p className="ent-section-eyebrow">Workspace</p>
        <h1 className="ent-dash-home-title">{orgName}</h1>
        <p className="ent-page-lead">
          What is happening, what needs attention, what changed, and what to do next.
        </p>
      </header>

      <div className="ent-metric-rail" aria-label="Catalog metrics">
        <Link href={`${base}/products`} className="ent-metric-rail-item">
          <span className="ent-metric-rail-value">{padCount(total)}</span>
          <span className="ent-metric-rail-label">Products</span>
        </Link>
        <Link href={`${base}/passports`} className="ent-metric-rail-item">
          <span className="ent-metric-rail-value">{padCount(overview.publishedCount)}</span>
          <span className="ent-metric-rail-label">Published</span>
        </Link>
        <Link href={`${base}/passports`} className="ent-metric-rail-item">
          <span className="ent-metric-rail-value">{padCount(overview.readyCount)}</span>
          <span className="ent-metric-rail-label">Ready</span>
        </Link>
        <Link href={`${base}/issues`} className="ent-metric-rail-item">
          <span className="ent-metric-rail-value">{padCount(overview.issueCount)}</span>
          <span className="ent-metric-rail-label">Open issues</span>
        </Link>
        <div className="ent-metric-rail-item">
          <span className="ent-metric-rail-value">{readinessPct}%</span>
          <span className="ent-metric-rail-label">Catalog readiness</span>
        </div>
      </div>

      <div className="ent-dash-split">
        <section className="ent-dash-panel">
          <div className="ent-dash-panel-head">
            <h2>Catalog readiness</h2>
            <Link href={`${base}/passports`}>Open passports →</Link>
          </div>
          {total > 0 ? (
            <div className="ent-dash-readiness">
              <EntDonutChart
                segments={lifecycleSegments}
                centerValue={`${readinessPct}%`}
                centerLabel="Ready"
                size={168}
                strokeWidth={14}
                light
              />
              <ul>
                {lifecycleSegments.map((segment) => (
                  <li key={segment.key}>
                    <span>
                      <i style={{ background: segment.color }} />
                      {segment.label}
                    </span>
                    <strong>{segment.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="ent-dash-empty">Import products to see passport readiness.</p>
          )}
        </section>

        <section className="ent-dash-panel">
          <div className="ent-dash-panel-head">
            <h2>Needs attention</h2>
            <Link href={next.href}>{next.label} →</Link>
          </div>
          {attention.length ? (
            <ul className="ent-dash-attention">
              {attention.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={item.emphasis ? "is-emphasis" : ""}>
                    <span>{item.label}</span>
                    <strong>{padCount(item.count)}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ent-dash-empty">Nothing blocking right now. {next.body}</p>
          )}
          <p className="ent-dash-next">
            Next: {next.title}
          </p>
        </section>
      </div>

      <section className="ent-dash-panel">
        <div className="ent-dash-panel-head">
          <h2>Environmental intelligence</h2>
          <Link href={`${base}/impact`}>Open impact →</Link>
        </div>
        {envSegments.length ? (
          <ImpactLcaBars segments={envSegments} unit="share" />
        ) : (
          <p className="ent-dash-empty">Composition coverage appears here once material data is on the catalog.</p>
        )}
      </section>

      <div className="ent-dash-split">
        <section className="ent-dash-panel">
          <div className="ent-dash-panel-head">
            <h2>Recent workflow activity</h2>
            <Link href={`${base}/activity`}>Open activity →</Link>
          </div>
          <EntActivityFeed items={overview.recentActivity} />
        </section>

        <section className="ent-dash-panel">
          <div className="ent-dash-panel-head">
            <h2>Consumer signals / material benchmark</h2>
            <Link href={`${base}/benchmarking`}>Open benchmarking →</Link>
          </div>
          <div className="ent-dash-signals">
            <p className="ent-dash-signal-headline">
              {signalLead?.headline || "Material reality versus peer medians"}
            </p>
            <p className="ent-dash-empty">
              {signalLead?.body ||
                "Natural fiber share, composition coverage, and passport readiness against governed peer aggregates."}
            </p>
            <dl>
              <div>
                <dt>Natural fiber</dt>
                <dd>{stats.naturalFiberShare != null ? `${stats.naturalFiberShare}%` : "—"}</dd>
              </div>
              <div>
                <dt>Composition complete</dt>
                <dd>{stats.compositionCoveragePct != null ? `${stats.compositionCoveragePct}%` : "—"}</dd>
              </div>
              <div>
                <dt>Opportunity</dt>
                <dd>{signals.summary.opportunityScore ?? "—"}</dd>
              </div>
              <div>
                <dt>Avg natural</dt>
                <dd>{signals.summary.avgNaturalPct != null ? `${signals.summary.avgNaturalPct}%` : "—"}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}
