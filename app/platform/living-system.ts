export const LIVING_SYSTEM = {
  eyebrow: "Why brands keep INTERTEXE",
  title: "A living system, not a one-off passport file.",
  body: "After the first passports, the question should not be “why are we still paying INTERTEXE?” The catalog stays in a material intelligence system that merchandising and sustainability teams use every week.",
} as const;

export const RETAIN = [
  {
    id: "manage",
    title: "Manage",
    copy: "Your material and product information stays organized and continuously updated in one workspace.",
  },
  {
    id: "improve",
    title: "Improve",
    copy: "INTERTEXE keeps identifying gaps, conflicts and missing information as the catalog changes.",
  },
  {
    id: "compare",
    title: "Compare",
    copy: "Understand your material strategy relative to peers and, over time, observed consumer demand.",
  },
  {
    id: "publish",
    title: "Publish",
    copy: "Generate, host and update Digital Product Passports from the same underlying data — when you are ready.",
  },
] as const;

export const DISCOVER_STORY = [
  {
    id: "compare",
    label: "Compare",
    frameId: "benchmark",
    title: "Compare",
    copy: RETAIN[2].copy,
    note: "Observed consumer demand is coming / developing — not a live statistical product yet.",
  },
  {
    id: "act",
    label: "Act",
    frameId: "studio",
    title: "Improve, then publish",
    copy: `${RETAIN[1].copy} ${RETAIN[3].copy}`,
    note: "Preparation status and required-field completeness — not legal certification.",
  },
  {
    id: "engage",
    label: "Engage",
    frameId: "overview",
    title: "Stay in the workspace",
    copy: "The same records stay useful after the first passports. Consumer discovery in the INTERTEXE iPhone app and Chrome extension is a separate surface — shopper demand in brand workspaces is coming / developing.",
    note: "Consumers do not need the INTERTEXE app to open a passport.",
  },
] as const;
