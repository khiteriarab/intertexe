"use client";

import { ProductLifecycleSection } from "./ProductLifecycleSection";
import { DemoFeaturedExample } from "./DemoFeaturedExample";
import { DemoProductWorkflow } from "./DemoProductWorkflow";

/** See it live — lifecycle story, then workflow walkthrough and featured passport. */
export function PlatformDemoClient() {
  return (
    <>
      <ProductLifecycleSection />
      <DemoProductWorkflow />
      <DemoFeaturedExample />
    </>
  );
}
