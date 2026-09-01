import { EntEmptyState, EntPageHeader } from "../../components/EnterpriseUi";
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
      <div className="ent-float-card px-8 py-10 md:px-10 md:py-12 mb-10">
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
  tone: _tone = "blush",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "blush" | "butter" | "stone" | "cream";
}) {
  return (
    <div className="ent-float-card p-6 md:p-8">
      <h2 className="ent-heading text-lg text-[var(--ent-ink)] mb-5">{title}</h2>
      {children}
    </div>
  );
}

export { ORG_PAGE_STATES };
