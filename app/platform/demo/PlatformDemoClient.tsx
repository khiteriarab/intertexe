"use client";

import { useState } from "react";
import { DemoFeaturedExample } from "./DemoFeaturedExample";
import { DemoHero } from "./DemoHero";
import { DemoIntertexeFlow } from "./DemoIntertexeFlow";
import { DemoProductWorkflow, type FlowStepId } from "./DemoProductWorkflow";

/** See it live — editorial layout with the full Silk Midi Skirt storyline. */
export function PlatformDemoClient() {
  const [workflowStep, setWorkflowStep] = useState<FlowStepId>("source");

  return (
    <>
      <DemoHero />
      <DemoIntertexeFlow activeStep={workflowStep} onSelectStep={setWorkflowStep} />
      <DemoProductWorkflow activeStep={workflowStep} onSelectStep={setWorkflowStep} />
      <DemoFeaturedExample />
    </>
  );
}
