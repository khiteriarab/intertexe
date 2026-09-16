import type { ProductLifecycleState } from "../../../lib/enterprise/product-lifecycle";

export function ProductLifecycleNav({ state }: { state: ProductLifecycleState }) {
  return (
    <nav className="ent-lifecycle-nav" aria-label="Product lifecycle">
      <ol className="ent-lifecycle-nav-list">
        {state.steps.map((step, index) => (
          <li
            key={step.id}
            className={`ent-lifecycle-nav-step ent-lifecycle-nav-step--${step.status}`}
            aria-current={step.status === "current" ? "step" : undefined}
          >
            {index > 0 ? <span className="ent-lifecycle-nav-arrow" aria-hidden /> : null}
            <span className="ent-lifecycle-nav-label">{step.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
