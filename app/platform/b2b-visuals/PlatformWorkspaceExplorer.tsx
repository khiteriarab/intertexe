"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ENTERPRISE_GROUP_TAGLINES,
  enterpriseModuleCatalogByGroup,
  marketingMaturityFootnote,
  type EnterpriseModuleCatalogEntry,
} from "../../../lib/enterprise/marketing-modules";
import { implementationLabel, type ImplementationState } from "../../../lib/enterprise/page-states";

const MATURITY_BADGE: Record<ImplementationState, string> = {
  implemented: "platform-module-badge platform-module-badge-production",
  partial: "platform-module-badge platform-module-badge-operational",
  placeholder: "platform-module-badge platform-module-badge-roadmap",
};

/** SaaS screenshots for workspace explorer — extend as more captures are designed. */
const MODULE_SCREENSHOTS: Record<string, string> = {
  Overview: "/platform/hero-workspace-desktop.png",
  Products: "/platform/workspace-products.png",
  Issues: "/platform/workspace-issues.png",
  Traceability: "/platform/understand-issues.png",
  Passports: "/platform/act-passport.png",
  Workflows: "/platform/hero-workspace-desktop.png",
  "Import center": "/platform/understand-ingest-laptop.jpg",
  Approvals: "/platform/hero-workspace-desktop.png",
  Suppliers: "/platform/hero-workspace-desktop.png",
  Files: "/platform/hero-workspace-desktop.png",
  Activity: "/platform/hero-workspace-desktop.png",
  "Audit log": "/platform/hero-workspace-desktop.png",
  Regulations: "/platform/compare-benchmark.png",
  "Signals & benchmarks": "/platform/compare-benchmark.png",
  Analytics: "/platform/workspace-analytics.png",
  Integrations: "/platform/hero-workspace-desktop.png",
  Developers: "/platform/api-docs-editorial.jpg",
  Exports: "/platform/hero-workspace-desktop.png",
  Billing: "/platform/hero-workspace-desktop.png",
  Settings: "/platform/hero-workspace-desktop.png",
};

const DEFAULT_SCREEN = "/platform/hero-workspace-desktop.png";

function GroupIcon({ groupId }: { groupId: string }) {
  const cls = "h-4 w-4 text-[var(--platform-primary)]";
  if (groupId === "core") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (groupId === "operations") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 2 2 7l10 5 10-5-10-5Z" />
        <path d="m2 17 10 5 10-5" />
        <path d="m2 12 10 5 10-5" />
      </svg>
    );
  }
  if (groupId === "intelligence") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function screenshotForModule(mod: EnterpriseModuleCatalogEntry): string {
  return MODULE_SCREENSHOTS[mod.label] || DEFAULT_SCREEN;
}

function ModuleFlipCard({
  mod,
  active,
  onSelect,
}: {
  mod: EnterpriseModuleCatalogEntry;
  active: boolean;
  onSelect: () => void;
}) {
  const shot = screenshotForModule(mod);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`platform-workspace-flip ${active ? "is-flipped is-active" : ""}`}
    >
      <span className="platform-workspace-flip-inner">
        <span className="platform-workspace-flip-face platform-workspace-flip-front">
          <span className="platform-workspace-flip-head">
            <span className="platform-module-item-label">{mod.label}</span>
            <span className={MATURITY_BADGE[mod.state]}>{implementationLabel(mod.state)}</span>
          </span>
          <span className="platform-module-item-copy">{mod.description}</span>
          <span className="platform-workspace-flip-hint">Tap to preview →</span>
        </span>
        <span className="platform-workspace-flip-face platform-workspace-flip-back">
          <span className="platform-workspace-flip-shot">
            <Image src={shot} alt="" fill className="object-cover object-top" sizes="280px" />
          </span>
          <span className="platform-workspace-flip-back-label">{mod.label}</span>
        </span>
      </span>
    </button>
  );
}

function ScreenMockup({ mod }: { mod: EnterpriseModuleCatalogEntry }) {
  const shot = screenshotForModule(mod);
  return (
    <div className="platform-workspace-screen">
      <div className="platform-workspace-screen-chrome" aria-hidden>
        <span className="platform-workspace-screen-dot" />
        <span className="platform-workspace-screen-dot" />
        <span className="platform-workspace-screen-dot" />
        <span className="platform-workspace-screen-url">app.intertexe.com/{mod.groupId}/{mod.href || "overview"}</span>
      </div>
      <div className="platform-workspace-screen-body">
        <Image
          key={mod.label}
          src={shot}
          alt={`INTERTEXE workspace — ${mod.label}`}
          fill
          className="object-cover object-top platform-workspace-screen-image"
          sizes="(max-width: 1024px) 100vw, 640px"
          priority={mod.label === "Products"}
        />
      </div>
      <p className="platform-workspace-screen-caption">
        {mod.label} · {ENTERPRISE_GROUP_TAGLINES[mod.groupId] || mod.groupLabel}
      </p>
    </div>
  );
}

export function PlatformWorkspaceExplorer() {
  const groups = useMemo(() => enterpriseModuleCatalogByGroup(), []);
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id ?? "core");
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const selectedMod =
    activeGroup?.modules.find((m) => m.label === selectedLabel) ?? activeGroup?.modules[0];

  if (!activeGroup || !selectedMod) return null;

  return (
    <div className="platform-workspace-explorer">
      <nav className="platform-workspace-groups" aria-label="Workspace module groups">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => {
              setActiveGroupId(group.id);
              setSelectedLabel(null);
            }}
            aria-current={group.id === activeGroupId ? "true" : undefined}
            className={`platform-workspace-group-tab ${group.id === activeGroupId ? "is-active" : ""}`}
          >
            <span className="platform-workspace-group-icon" aria-hidden>
              <GroupIcon groupId={group.id} />
            </span>
            <span className="platform-workspace-group-text">
              <span className="platform-module-group-title">{group.label}</span>
              <span className="platform-module-group-tagline">
                {ENTERPRISE_GROUP_TAGLINES[group.id] || "Workspace modules"}
              </span>
            </span>
          </button>
        ))}
      </nav>

      <div className="platform-workspace-list-panel">
        <p className="platform-workspace-list-heading">
          {activeGroup.label}
          <span>{activeGroup.modules.length} modules</span>
        </p>
        <div className="platform-workspace-flip-list" role="list">
          {activeGroup.modules.map((mod) => (
            <div key={mod.label} role="listitem">
              <ModuleFlipCard
                mod={mod}
                active={selectedMod.label === mod.label}
                onSelect={() => setSelectedLabel(mod.label)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="platform-workspace-screen-panel" aria-live="polite">
        <ScreenMockup mod={selectedMod} />
      </div>

      <footer className="platform-module-footer platform-workspace-explorer-footer">
        <p>{marketingMaturityFootnote()}.</p>
        <p className="platform-module-footer-tagline">People · Products · A cleaner tomorrow</p>
      </footer>
    </div>
  );
}
