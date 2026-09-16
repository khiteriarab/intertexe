import type { ProductTraceability } from "../../../lib/enterprise/traceability";
import { ProductTraceabilityGraph } from "./ProductTraceabilityGraph";

export function TraceabilityPanel({
  traceability,
  productName,
}: {
  traceability: ProductTraceability;
  productName?: string | null;
}) {
  return <ProductTraceabilityGraph traceability={traceability} productName={productName} />;
}
