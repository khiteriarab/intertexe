import { EntEmptyState, EntPageHeader, EntSurface } from "../../components/EnterpriseUi";
import { ORG_PAGE_STATES, type ImplementationState } from "../../../../lib/enterprise/page-states";
import { StateBadge } from "./StateBadge";

export function OrgSectionFrame({
  title,
  description,
  state,
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
      <EntPageHeader title={title} description={description} action={<StateBadge state={state} />} brandLine={brandLine} />
      {children}
      {emptyTitle && emptyBody ? <EntEmptyState title={emptyTitle} body={emptyBody} /> : null}
    </div>
  );
}

export { EntSurface as HqCard, ORG_PAGE_STATES };
