export type GettingStartedStep = {
  id: string;
  title: string;
  body: string;
  href: string;
  label: string;
  icon: "products" | "issues" | "passports";
  done: boolean;
  minutesEstimate: number;
  /** Plain-language checklist for the workspace admin completing this step. */
  checklist: string[];
};

export function buildGettingStartedSteps(overview: {
  productCount: number;
  issueCount: number;
  readyCount: number;
  publishedCount: number;
}): GettingStartedStep[] {
  return [
    {
      id: "import",
      title: "Import your catalog",
      body: "Upload a CSV, map columns, and preview identifier matches before confirming.",
      href: "/products?import=1",
      label: "Import products",
      icon: "products",
      done: overview.productCount > 0,
      minutesEstimate: 15,
      checklist: [
        "Export a product CSV from your PIM, ERP, or spreadsheet",
        "Map columns to INTERTEXE fields (SKU, composition, origin)",
        "Preview identifier matches before confirming the import",
      ],
    },
    {
      id: "review",
      title: "Review product fields",
      body: "Open products, compare source vs canonical data, and approve required fields.",
      href: "/products",
      label: "Review catalog",
      icon: "products",
      done: overview.productCount > 0 && overview.issueCount === 0,
      minutesEstimate: 20,
      checklist: [
        "Open a product and compare source vs governed fields",
        "Approve composition, origin, and identifier fields",
        "Confirm material normalization looks correct",
      ],
    },
    {
      id: "issues",
      title: "Resolve open issues",
      body: "Clear blocking findings and missing composition or origin data.",
      href: "/issues",
      label: "Open issues",
      icon: "issues",
      done: overview.issueCount === 0 && overview.productCount > 0,
      minutesEstimate: 15,
      checklist: [
        "Review blocking and attention issues in the register",
        "Fill missing composition or manufacturing country data",
        "Mark resolved items once fields are approved",
      ],
    },
    {
      id: "publish",
      title: "Publish passports",
      body: "Release digital product passports when products are ready and compliant.",
      href: "/passports",
      label: "Go to passports",
      icon: "passports",
      done: overview.publishedCount > 0,
      minutesEstimate: 10,
      checklist: [
        "Open passports ready for publication",
        "Generate QR and persistent product identity",
        "Scan the live passport on mobile to verify",
      ],
    },
  ];
}

export function isOnboardingComplete(steps: GettingStartedStep[]): boolean {
  return steps.length > 0 && steps.every((s) => s.done);
}

export function onboardingStats(steps: GettingStartedStep[]) {
  const completed = steps.filter((s) => s.done).length;
  const remaining = steps.filter((s) => !s.done);
  const remainingMinutes = remaining.reduce((sum, s) => sum + s.minutesEstimate, 0);
  const progressPct = steps.length ? Math.round((completed / steps.length) * 100) : 0;

  return {
    completed,
    total: steps.length,
    progressPct,
    remainingMinutes,
    remainingTasks: remaining.length,
    nextStep: remaining[0] || steps[steps.length - 1] || null,
  };
}

export const ONBOARDING_SKIP_COOKIE = "ent_onboarding_skip";

export function onboardingSkipCookieName(orgSlug: string): string {
  return `${ONBOARDING_SKIP_COOKIE}_${orgSlug}`;
}
