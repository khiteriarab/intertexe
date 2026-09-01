import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgActivityFeed } from "../../../../../lib/enterprise/module-queries";
import { EntActivityFeed } from "../../../components/EnterpriseUi";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";
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
    >
      {items.length === 0 ? (
        <EntActivityFeed items={[]} />
      ) : (
        <div className="space-y-10 md:space-y-12">
          {order.map((group) => {
            const groupItems = grouped.get(group);
            if (!groupItems?.length) return null;
            return (
              <section key={group}>
                <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--ent-muted-light)] mb-6">{group}</p>
                <ul>
                  {groupItems.map((item, index) => {
                    const { headline, detail } = parseActivityFeedLine(item.title);
                    const when = formatRelativeActivityTime(item.created_at);
                    const actorLine = item.actor ? formatReviewerLine(item.actor, item.created_at) : null;
                    return (
                      <li
                        key={item.id}
                        className={`relative pl-8 pb-8 border-b border-[var(--ent-border)] last:border-0 ${index === groupItems.length - 1 ? "pb-0" : ""}`}
                      >
                        <span className={`absolute left-0 top-1.5 h-2 w-2 rounded-full ${activityDotClass(headline)}`} aria-hidden />
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="text-[16px] font-medium text-[var(--ent-ink)]">{headline}</p>
                          {when ? (
                            <time className="text-xs text-[var(--ent-muted-light)]" dateTime={item.created_at}>
                              {when}
                            </time>
                          ) : null}
                        </div>
                        {detail ? <p className="text-sm text-[var(--ent-muted)] mt-1.5">{detail}</p> : null}
                        {item.detail ? <p className="text-sm text-[var(--ent-muted-light)] mt-1">{item.detail}</p> : null}
                        {actorLine ? <p className={`text-xs text-[var(--ent-muted-light)] mt-2`}>{actorLine}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </EntModulePage>
  );
}
