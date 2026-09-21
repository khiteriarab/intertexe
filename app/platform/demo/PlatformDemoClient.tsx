"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProductLifecycleSection } from "./ProductLifecycleSection";
import { DemoProductWorkflow } from "./DemoProductWorkflow";
import { ProductLifecycleMap } from "./_lifecycle-v2/ProductLifecycleMap";

function DemoBody() {
  const params = useSearchParams();
  const useV2 = params.get("map") === "v2";

  return (
    <>
      {useV2 ? <ProductLifecycleMap /> : <ProductLifecycleSection />}
      <DemoProductWorkflow />
    </>
  );
}

/** See it live — default current map; `?map=v2` swaps in the architecture prototype. */
export function PlatformDemoClient() {
  return (
    <Suspense fallback={<ProductLifecycleSection />}>
      <DemoBody />
    </Suspense>
  );
}
