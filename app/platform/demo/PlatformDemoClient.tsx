"use client";

import { DemoFeaturedExample } from "./DemoFeaturedExample";
import { DemoHero } from "./DemoHero";
import { DemoProductWorkflow } from "./DemoProductWorkflow";

/** See it live — editorial layout with the Silk Midi Skirt record and sample passports. */
export function PlatformDemoClient() {
  return (
    <>
      <DemoHero />
      <DemoProductWorkflow />
      <DemoFeaturedExample />
    </>
  );
}
