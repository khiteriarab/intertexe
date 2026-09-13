/** Customer SaaS workspace routes — not founder HQ (/dashboard/command-center, etc.). */

export function orgDashboardBase(slug: string): string {
  return `/dashboard/${slug}`;
}

export function orgUpgradeUrl(slug: string): string {
  return `${orgDashboardBase(slug)}/upgrade`;
}

export function orgBillingUrl(slug: string): string {
  return `${orgDashboardBase(slug)}/billing`;
}
