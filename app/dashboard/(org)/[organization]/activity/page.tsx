import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgActivityFeed } from "../../../../../lib/enterprise/module-queries";
import { EntModulePage, EntVisualPanel } from "../../../components/EnterpriseModuleUi";
import { formatReviewerLine } from "../../../../../lib/enterprise/reviewer-display";
import {
  activityDateGroup,
  formatRelativeActivityTime,
  parseActivityFeedLine,
} from "../../../../../lib/enterprise/display-format";

export const dynamic = "force-dynamic";

function activityDotClass(headline: string): string {
  if (headline.startsWith("Published")) return "bg-[var(--ent-forest)]";
  if (headline.startsWith("Imported")) return "bg-[var(--ent-petrol)]";
  return "bg-[var(--ent-stone)]";
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const items = await loadOrgActivityFeed(client, membership.organizationId, 100);

  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const group = activityDateGroup(item.created_at);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(item);
  }
  const order: Array<"Today" | "Yesterday" | "Earlier"> = ["Today", "Yesterday", "Earlier"];

  return (
    <EntModulePage
      title="Activity"
      description="Organization activity recorded by INTERTEXE — imports, reviews, publishes, and field updates."
      zone="stone"
    >
      {items.length === 0 ? (
        <EntVisualPanel tone="cream">
          <p className="text-sm text-[var(--ent-muted)]">No activity recorded yet.</p>
        </EntVisualPanel>
      ) : (
        <EntVisualPanel tone="cream" padding="large">
          <div className="space-y-14">
            {order.map((group) => {
              const groupItems = grouped.get(group);
              if (!groupItems?.length) return null;
              return (
                <section key={group} className="relative">
                  <p className="ent-serif text-[1.75rem] md:text-[2rem] text-[var(--ent-ink)] mb-8">{group}</p>
                  <ul className="relative pl-2">
                    <span className="ent-timeline-spine" aria-hidden />
                    {groupItems.map((item, index) => {
                      const { headline, detail } = parseActivityFeedLine(item.title);
                      const when = formatRelativeActivityTime(item.created_at);
                      const actorLine = item.actor ? formatReviewerLine(item.actor, item.created_at) : null;
                      return (
                        <li key={item.id} className={`relative pl-12 ${index < groupItems.length - 1 ? "pb-8" : ""}`}>
                          <span
                            className={`absolute left-0 top-2 h-7 w-7 rounded-full border-[3px] border-white shadow-md ${activityDotClass(headline)}`}
                            aria-hidden
                          />
                          <div className="ent-panel-nested px-5 py-5 md:px-6 md:py-6">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                              <p className="text-[17px] font-medium text-[var(--ent-ink)]">{headline}</p>
                              {when ? (
                                <time className="text-xs text-[var(--ent-muted-light)]" dateTime={item.created_at}>
                                  {when}
                                </time>
                              ) : null}
                            </div>
                            {detail ? <p className="text-sm text-[var(--ent-muted)] mt-2 leading-relaxed">{detail}</p> : null}
                            {item.detail ? <p className="text-sm text-[var(--ent-muted-light)] mt-1">{item.detail}</p> : null}
                            {actorLine ? <p className="text-xs text-[var(--ent-muted-light)] mt-3">{actorLine}</p> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </EntVisualPanel>
      )}
    </EntModulePage>
  );
}
