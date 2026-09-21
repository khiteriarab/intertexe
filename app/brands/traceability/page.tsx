import type { Metadata } from "next";
import { SolutionDetailPage, solutionMetadata } from "../_lib/solution-page";

export const metadata: Metadata = solutionMetadata("traceability");

export default function Page() {
  return <SolutionDetailPage segment="traceability" />;
}
