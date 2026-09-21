"use client";

import { ProductLifecycleSection } from "./ProductLifecycleSection";
import { DemoProductWorkflow } from "./DemoProductWorkflow";

/** See it live — lifecycle story, then how teams use the product record. */
export function PlatformDemoClient() {
  return (
    <>
      <ProductLifecycleSection />
      <DemoProductWorkflow />
    </>
  );
}
