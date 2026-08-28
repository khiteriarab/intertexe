export type WorkspaceContext =
  | { type: "hq"; label: string; href: string }
  | { type: "org"; label: string; href: string; slug: string; role: string };

export type EnterpriseMembership = {
  organizationId: string;
  slug: string;
  name: string;
  role: string;
  kind: string;
  plan: string;
  isDemo: boolean;
  productAllowance?: number | null;
};
