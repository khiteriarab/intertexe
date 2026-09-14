"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  LIFECYCLE_GROUP_TAGLINES,
  LIFECYCLE_RAIL,
  lifecycleModuleCatalogByGroup,
  type LifecycleModuleEntry,
} from "../../../lib/enterprise/lifecycle-modules";

/** SaaS screenshots mapped to lifecycle outcomes — not internal module names. */
const MODULE_SCREENSHOTS: Record<string, string> = {
  "product-creation": "/platform/workspace-products.png",
  "supply-chain": "/platform/hero-workspace-desktop.png",
  evidence: "/platform/understand-ingest-laptop.jpg",
  "governed-record": "/platform/understand-issues.png",
  traceability: "/platform/understand-issues.png",
  "environmental-impact": "/platform/workspace-analytics.png",
  compliance: "/platform/compare-benchmark.png",
  verification: "/platform/workspace-issues.png",
  "material-benchmark": "/platform/compare-benchmark.png",
  "catalog-intelligence": "/platform/workspace-analytics.png",
  "consumer-signals": "/platform/compare-benchmark.png",
  "impact-insights": "/platform/workspace-analytics.png",
  "digital-product-passport": "/platform/act-passport.png",
  "care-repair": "/platform/hero-lifecycle-experience.jpg",
  "resale-value": "/platform/hero-lifecycle-composite.png",
  "resale-transfer": "/platform/act-passport.png",
  circularity: "/platform/hero-lifecycle-experience.jpg",
};

const DEFAULT_SCREEN = "/platform/hero-workspace-desktop.png";

function GroupIcon({ groupId }: { groupId: string }) {
  const cls = "h-4 w-4 text-[var(--platform-primary)]";
  if (groupId === "create") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 3v18M3 12h18" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  if (groupId === "prove") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M9 12 11 14 15 10" />
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      </svg>
    );
  }
  if (groupId === "understand") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 12h16" />
      <path d="M12 4v16" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function screenshotForModule(mod: LifecycleModuleEntry): string {
  return MODULE_SCREENSHOTS[mod.id] || DEFAULT_SCREEN;
}

function ModuleFlipCard({
  mod,
  active,
  onSelect,
}: {
  mod: LifecycleModuleEntry;
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

function ScreenMockup({ mod }: { mod: LifecycleModuleEntry }) {
  const shot = screenshotForModule(mod);
  return (
    <div className="platform-workspace-screen">
      <div className="platform-workspace-screen-chrome" aria-hidden>
        <span className="platform-workspace-screen-dot" />
        <span className="platform-workspace-screen-dot" />
        <span className="platform-workspace-screen-dot" />
        <span className="platform-workspace-screen-url">
          app.intertexe.com/{mod.groupId}/{mod.previewSlug}
        </span>
      </div>
      <div className="platform-workspace-screen-body">
        <Image
          key={mod.id}
          src={shot}
          alt={`INTERTEXE — ${mod.label}`}
          fill
          className="object-cover object-top platform-workspace-screen-image"
          sizes="(max-width: 1024px) 100vw, 640px"
          priority={mod.id === "product-creation"}
        />
      </div>
      <p className="platform-workspace-screen-caption">
        {mod.label} · {LIFECYCLE_GROUP_TAGLINES[mod.groupId] || mod.groupLabel}
      </p>
    </div>
  );
}

function LifecycleRail() {
  return (
    <div className="platform-lifecycle-rail" aria-label="Product lifecycle">
      {LIFECYCLE_RAIL.map((stage, index) => (
        <span key={stage} className="platform-lifecycle-rail-item">
          <span className="platform-lifecycle-rail-label">{stage}</span>
          {index < LIFECYCLE_RAIL.length - 1 ? (
            <span className="platform-lifecycle-rail-arrow" aria-hidden>
              →
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function PlatformWorkspaceExplorer() {
  const groups = useMemo(() => lifecycleModuleCatalogByGroup(), []);
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id ?? "create");
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedMod = activeGroup?.modules.find((m) => m.id === selectedId) ?? activeGroup?.modules[0];

  if (!activeGroup || !selectedMod) return null;

  return (
    <div className="platform-workspace-explorer">
      <div className="platform-workspace-groups-column">
        <nav className="platform-workspace-groups" aria-label="Product lifecycle stages">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                setActiveGroupId(group.id);
                setSelectedId(null);
              }}
              aria-current={group.id === activeGroupId ? "true" : undefined}
              className={`platform-workspace-group-tab ${group.id === activeGroupId ? "is-active" : ""}`}
            >
              <span className="platform-workspace-group-icon" aria-hidden>
                <GroupIcon groupId={group.id} />
              </span>
              <span className="platform-workspace-group-text">
                <span className="platform-module-group-title">{group.label}</span>
                <span className="platform-module-group-tagline">{group.tagline}</span>
              </span>
            </button>
          ))}
        </nav>
        <LifecycleRail />
      </div>

      <div className="platform-workspace-list-panel">
        <p className="platform-workspace-list-heading">
          {activeGroup.label}
          <span>{activeGroup.tagline}</span>
        </p>
        <div className="platform-workspace-flip-list" role="list">
          {activeGroup.modules.map((mod) => (
            <div key={mod.id} role="listitem">
              <ModuleFlipCard
                mod={mod}
                active={selectedMod.id === mod.id}
                onSelect={() => setSelectedId(mod.id)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="platform-workspace-screen-panel" aria-live="polite">
        <ScreenMockup mod={selectedMod} />
      </div>

      <footer className="platform-module-footer platform-workspace-explorer-footer">
        <p className="platform-module-footer-tagline">People · Products · A cleaner tomorrow</p>
      </footer>
    </div>
  );
}
