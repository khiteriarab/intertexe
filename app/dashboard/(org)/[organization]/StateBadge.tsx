import { implementationLabel, type ImplementationState } from "../../../../lib/enterprise/page-states";

export function StateBadge({ state }: { state: ImplementationState }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/15 px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase text-black/55">
      {implementationLabel(state)}
    </span>
  );
}
