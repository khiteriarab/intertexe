"use client";

/**
 * See It Live — Follow the Record walkthrough.
 * Canvas is inlined in FollowTheRecordSection; this re-export keeps tests/imports stable.
 */

import { FollowTheRecordSection } from "./FollowTheRecordSection";
import { FOLLOW_STAGES, type FollowStageId } from "./follow-the-record-data";

export function StickyDemoCanvas({ stage }: { stage: FollowStageId }) {
  const active = FOLLOW_STAGES.find((item) => item.id === stage) ?? FOLLOW_STAGES[0];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={active.image} alt={active.alt} width={1672} height={941} />
  );
}

export { FollowTheRecordSection };
