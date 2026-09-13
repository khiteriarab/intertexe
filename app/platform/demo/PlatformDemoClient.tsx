"use client";

import { DemoClosingQuote } from "./DemoClosingQuote";
import { DemoFeaturedExample } from "./DemoFeaturedExample";
import { DemoHero } from "./DemoHero";
import { DemoIntertexeFlow } from "./DemoIntertexeFlow";
import { DemoStoryline } from "./DemoStoryline";

/** See it live — editorial layout with the full Silk Midi Skirt storyline. */
export function PlatformDemoClient() {
  return (
    <>
      <DemoHero />
      <DemoIntertexeFlow />
      <DemoStoryline />
      <DemoFeaturedExample />
      <DemoClosingQuote />
    </>
  );
}
