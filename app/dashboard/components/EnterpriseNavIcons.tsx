import type { ReactNode } from "react";

type IconProps = { className?: string };

function base({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export function EntIconOverview({ className }: IconProps) {
  return base({ className, children: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /></> });
}
export function EntIconProducts({ className }: IconProps) {
  return base({ className, children: <><path d="M6 3h12l2 5H4l2-5Z" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></> });
}
export function EntIconIssues({ className }: IconProps) {
  return base({ className, children: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" /></> });
}
export function EntIconPassports({ className }: IconProps) {
  return base({ className, children: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h4" /></> });
}
export function EntIconSuppliers({ className }: IconProps) {
  return base({ className, children: <><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><circle cx="12" cy="8" r="4" /><path d="M20 8v6" /><path d="M23 11h-6" /></> });
}
export function EntIconFiles({ className }: IconProps) {
  return base({ className, children: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" /><path d="M14 2v6h6" /></> });
}
export function EntIconActivity({ className }: IconProps) {
  return base({ className, children: <><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></> });
}
export function EntIconWorkflows({ className }: IconProps) {
  return base({ className, children: <><path d="M4 6h6" /><path d="M14 6h6" /><path d="M4 12h6" /><path d="M14 12h6" /><path d="M4 18h6" /><circle cx="17" cy="18" r="3" /></> });
}
export function EntIconRegulations({ className }: IconProps) {
  return base({ className, children: <><path d="M12 3 4 7v6c0 5 3.5 8 8 8s8-3 8-8V7l-8-4Z" /><path d="m9 12 2 2 4-4" /></> });
}
export function EntIconBenchmarking({ className }: IconProps) {
  return base({ className, children: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-8" /><path d="M22 20H2" /></> });
}
export function EntIconAnalytics({ className }: IconProps) {
  return base({ className, children: <><path d="M21 12a9 9 0 1 1-9-9" /><path d="M21 3v6h-6" /></> });
}
export function EntIconIntegrations({ className }: IconProps) {
  return base({ className, children: <><path d="M12 2v4" /><path d="M12 18v4" /><path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="m4.93 19.07 2.83-2.83" /><path d="m16.24 7.76 2.83-2.83" /></> });
}
export function EntIconDevelopers({ className }: IconProps) {
  return base({ className, children: <><path d="m8 9-4 3 4 3" /><path d="m16 9 4 3-4 3" /><path d="M14 4 10 20" /></> });
}
export function EntIconSettings({ className }: IconProps) {
  return base({ className, children: <><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></> });
}
export function EntIconCore({ className }: IconProps) {
  return base({ className, children: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> });
}
export function EntIconOperations({ className }: IconProps) {
  return base({ className, children: <><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></> });
}
export function EntIconIntelligence({ className }: IconProps) {
  return base({ className, children: <><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7Z" /><circle cx="12" cy="9" r="2.5" /></> });
}
export function EntIconSystem({ className }: IconProps) {
  return base({ className, children: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h6v6H9z" /></> });
}
export function EntIconChevron({ className, open }: IconProps & { open?: boolean }) {
  return (
    <svg
      className={`${className || ""} transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export const ENT_NAV_ITEM_ICONS = {
  overview: EntIconOverview,
  products: EntIconProducts,
  issues: EntIconIssues,
  passports: EntIconPassports,
  suppliers: EntIconSuppliers,
  files: EntIconFiles,
  activity: EntIconActivity,
  workflows: EntIconWorkflows,
  regulations: EntIconRegulations,
  benchmarking: EntIconBenchmarking,
  analytics: EntIconAnalytics,
  integrations: EntIconIntegrations,
  developers: EntIconDevelopers,
  settings: EntIconSettings,
} as const;

export const ENT_NAV_GROUP_ICONS = {
  core: EntIconCore,
  operations: EntIconOperations,
  intelligence: EntIconIntelligence,
  system: EntIconSystem,
} as const;

export type EntNavItemIcon = keyof typeof ENT_NAV_ITEM_ICONS;
export type EntNavGroupIcon = keyof typeof ENT_NAV_GROUP_ICONS;
