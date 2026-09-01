import { implementationLabel, type ImplementationState } from "../../../../lib/enterprise/page-states";

export function StateBadge({ state }: { state: ImplementationState }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--ent-surface-muted)] px-3 py-1 text-[11px] tracking-[0.06em] text-[var(--ent-muted)]">
      {implementationLabel(state)}
    </span>
  );
}
