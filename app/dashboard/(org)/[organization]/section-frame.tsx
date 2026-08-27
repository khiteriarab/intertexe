import { HqCard, HqEmptyState, HqPageHeader } from "../../components/HqUi";
import { ORG_PAGE_STATES, type ImplementationState } from "../../../../lib/enterprise/page-states";
import { StateBadge } from "./StateBadge";

export function OrgSectionFrame({
  title,
  description,
  state,
  children,
  emptyTitle,
  emptyBody,
}: {
  title: string;
  description: string;
  state: ImplementationState;
  children?: React.ReactNode;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  return (
    <div>
      <HqPageHeader title={title} description={description} action={<StateBadge state={state} />} />
      {children}
      {emptyTitle && emptyBody ? <HqEmptyState title={emptyTitle} body={emptyBody} /> : null}
    </div>
  );
}

export { HqCard, ORG_PAGE_STATES };
