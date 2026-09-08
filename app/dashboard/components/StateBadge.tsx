import { implementationLabel, type ImplementationState } from "../../../lib/enterprise/page-states";

const TONE: Record<ImplementationState, string> = {
  implemented: "bg-[#E4EDEA] text-[var(--ent-forest)]",
  partial: "bg-[rgba(232,197,71,0.22)] text-[#7a6218]",
  placeholder: "bg-[var(--ent-surface-muted)] text-[var(--ent-muted)]",
};

export function StateBadge({ state }: { state: ImplementationState }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-[0.04em] uppercase ${TONE[state]}`}
    >
      {implementationLabel(state)}
    </span>
  );
}
