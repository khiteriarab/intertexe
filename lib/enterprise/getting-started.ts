export type GettingStartedStep = {
  id: string;
  title: string;
  body: string;
  href: string;
  label: string;
  icon: "products" | "issues" | "passports";
  done: boolean;
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
    },
    {
      id: "review",
      title: "Review product fields",
      body: "Open products, compare source vs canonical data, and approve required fields.",
      href: "/products",
      label: "Review catalog",
      icon: "products",
      done: overview.productCount > 0 && overview.issueCount === 0,
    },
    {
      id: "issues",
      title: "Resolve open issues",
      body: "Clear blocking findings and missing composition or origin data.",
      href: "/issues",
      label: "Open issues",
      icon: "issues",
      done: overview.issueCount === 0 && overview.productCount > 0,
    },
    {
      id: "publish",
      title: "Publish passports",
      body: "Release digital product passports when products are ready and compliant.",
      href: "/passports",
      label: "Go to passports",
      icon: "passports",
      done: overview.publishedCount > 0,
    },
  ];
}
