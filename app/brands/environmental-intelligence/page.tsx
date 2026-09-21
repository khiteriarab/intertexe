import type { Metadata } from "next";
import { SolutionDetailPage, solutionMetadata } from "../_lib/solution-page";

export const metadata: Metadata = solutionMetadata("environmental-intelligence");

export default function Page() {
  return <SolutionDetailPage segment="environmental-intelligence" />;
}
