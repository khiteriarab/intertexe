"use client";

/**
 * See It Live — Follow the Record walkthrough.
 * Implementation lives in components/see-it-live/follow-the-record.
 * Kept as DemoProductWorkflow for existing imports / deep links (#journey).
 */

import { FollowTheRecordSection } from "../../../components/see-it-live/follow-the-record/FollowTheRecordSection";
import { FOLLOW_STAGES } from "../../../components/see-it-live/follow-the-record/follow-the-record-data";

/** @deprecated Prefer FOLLOW_STAGES — kept for DemoIntertexeFlow compatibility */
export const FLOW_STEPS = FOLLOW_STAGES.map((stage) => ({
  id: stage.id,
  num: stage.number,
  title: stage.label.charAt(0) + stage.label.slice(1).toLowerCase(),
  headline: stage.headline,
  copy: stage.body,
  image: `/platform/demo-${stage.id}.png`,
  alt: stage.headline,
}));

export type FlowStepId = (typeof FLOW_STEPS)[number]["id"];

export function DemoProductWorkflow() {
  return <FollowTheRecordSection />;
}
