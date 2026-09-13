"use client";

import { ProductLifecycleVisual } from "../b2b-visuals/ProductLifecycleVisual";
import { DemoApiProof } from "./DemoApiProof";
import { DemoCatalogGrid } from "./DemoCatalogGrid";
import { DemoHero } from "./DemoHero";
import { DemoLiveScan } from "./DemoLiveScan";
import { DemoPilotCta } from "./DemoPilotCta";
import { DemoScrollyJourney } from "./DemoScrollyJourney";

export function PlatformDemoClient() {
  return (
    <>
      <DemoHero />
      <DemoLiveScan />
      <section id="live-passport" className="scroll-mt-28 mb-16 sm:mb-24">
        <ProductLifecycleVisual />
      </section>
      <DemoScrollyJourney />
      <DemoCatalogGrid />
      <DemoApiProof />
      <DemoPilotCta />
    </>
  );
}
