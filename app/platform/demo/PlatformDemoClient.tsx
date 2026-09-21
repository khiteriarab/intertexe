"use client";

import ProductLifecycleSystem from "../../../components/see-it-live/ProductLifecycleSystem";
import { DemoProductWorkflow } from "./DemoProductWorkflow";

/** See it live — product system map, then software walkthrough. */
export function PlatformDemoClient() {
  return (
    <>
      <ProductLifecycleSystem />
      <DemoProductWorkflow />
    </>
  );
}
