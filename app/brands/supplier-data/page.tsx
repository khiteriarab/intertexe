import type { Metadata } from "next";
import { SolutionDetailPage, solutionMetadata } from "../_lib/solution-page";

export const metadata: Metadata = solutionMetadata("supplier-data");

export default function Page() {
  return <SolutionDetailPage segment="supplier-data" />;
}
