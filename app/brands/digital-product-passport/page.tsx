import type { Metadata } from "next";
import { SolutionDetailPage, solutionMetadata } from "../_lib/solution-page";

export const metadata: Metadata = solutionMetadata("digital-product-passport");

export default function Page() {
  return <SolutionDetailPage segment="digital-product-passport" />;
}
