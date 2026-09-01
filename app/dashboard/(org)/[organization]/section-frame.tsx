import { EntEmptyState, EntPageHeader, EntSurface } from "../../components/EnterpriseUi";
import { ORG_PAGE_STATES, type ImplementationState } from "../../../../lib/enterprise/page-states";

export function OrgSectionFrame({
  title,
  description,
  state: _state,
  children,
  emptyTitle,
  emptyBody,
  brandLine = false,
}: {
  title: string;
  description: string;
  state: ImplementationState;
  children?: React.ReactNode;
  emptyTitle?: string;
  emptyBody?: string;
  brandLine?: boolean;
}) {
  return (
    <div>
      <div className="ent-zone ent-zone-cream rounded-[var(--ent-radius-2xl)] px-8 py-10 md:px-10 md:py-12 mb-10 shadow-[var(--ent-shadow-panel)]">
        <EntPageHeader title={title} description={description} brandLine={brandLine} />
      </div>
      {children}
      {emptyTitle && emptyBody ? <EntEmptyState title={emptyTitle} body={emptyBody} /> : null}
    </div>
  );
}

export function HqCard({
  title,
  children,
  tone = "blush",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "blush" | "butter" | "stone" | "cream";
}) {
  return (
    <EntSurface title={title} variant="tint" padding="large" className={`ent-zone ent-zone-${tone} shadow-[var(--ent-shadow-panel)]`}>
      {children}
    </EntSurface>
  );
}

export { ORG_PAGE_STATES };
