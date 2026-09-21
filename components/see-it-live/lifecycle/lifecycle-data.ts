export type LifecycleStageId =
  | "source"
  | "clean"
  | "trace"
  | "prepare"
  | "publish"
  | "learn"
  | "recirculate";

export type LifecycleStage = {
  id: LifecycleStageId;
  number: string;
  title: string;
  short: string;
  micro: "source" | "normalize" | "trace" | "prepare" | "publish" | "learn" | "recirculate";
  /** Anchor position on the map canvas, percent of width/height */
  x: number;
  y: number;
};

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "source",
    number: "01",
    title: "Source & Make",
    short: "Materials, suppliers, manufacturing",
    micro: "source",
    x: 6,
    y: 38,
  },
  {
    id: "clean",
    number: "02",
    title: "Clean & Connect",
    short: "One trusted product record",
    micro: "normalize",
    x: 20,
    y: 22,
  },
  {
    id: "trace",
    number: "03",
    title: "Trace & Prove",
    short: "Claims linked to evidence",
    micro: "trace",
    x: 36,
    y: 18,
  },
  {
    id: "prepare",
    number: "04",
    title: "Check & Prepare",
    short: "Compliance and DPP readiness",
    micro: "prepare",
    x: 52,
    y: 20,
  },
  {
    id: "publish",
    number: "05",
    title: "Passport & Publish",
    short: "Governed identity distributed",
    micro: "publish",
    x: 68,
    y: 24,
  },
  {
    id: "learn",
    number: "06",
    title: "Use & Learn",
    short: "Intelligence from every channel",
    micro: "learn",
    x: 82,
    y: 36,
  },
  {
    id: "recirculate",
    number: "07",
    title: "Repair & Recirculate",
    short: "Useful beyond first sale",
    micro: "recirculate",
    x: 92,
    y: 58,
  },
];

export type RecordState = {
  composition: string;
  evidence: string;
  traceability: string;
  compliance: string;
  passport: string;
  readiness: number;
};

/** Nucleus content evolves with the active stage; shell stays fixed. */
export const RECORD_STATES: RecordState[] = [
  {
    composition: "Incoming values",
    evidence: "Pending",
    traceability: "Incomplete",
    compliance: "Review",
    passport: "Draft",
    readiness: 28,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Pending",
    traceability: "Incomplete",
    compliance: "Review",
    passport: "Draft",
    readiness: 46,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Review",
    passport: "Draft",
    readiness: 64,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Draft",
    readiness: 84,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Published",
    readiness: 94,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Published",
    readiness: 94,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Published",
    readiness: 94,
  },
];

export const DWELL_MS = 2400;
export const RESUME_MS = 6500;

/** Elegant left→right arc through the stage anchors (viewBox 0 0 1000 420). */
export const LIFECYCLE_PATH_D =
  "M 60 160 C 140 160, 170 95, 200 92 C 280 85, 320 78, 360 76 C 430 72, 480 78, 520 84 C 590 94, 640 100, 680 105 C 760 118, 800 145, 820 155 C 870 175, 900 220, 920 245";
