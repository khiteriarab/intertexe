"use client";

import { useEffect, useId, useRef } from "react";

export function EntDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = "wide",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: "normal" | "wide";
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const panelWidth = width === "wide" ? "max-w-[42rem]" : "max-w-[32rem]";

  return (
    <div className="ent-drawer-root" role="presentation">
      <button type="button" className="ent-drawer-backdrop" aria-label="Close panel" onClick={onClose} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`ent-drawer-panel ${panelWidth}`}
      >
        <div className="ent-drawer-header">
          <div className="min-w-0 pr-6">
            <p id={titleId} className="ent-title text-[1.35rem] md:text-[1.5rem] text-[var(--ent-ink)] leading-tight">
              {title}
            </p>
            {subtitle ? <p className="text-sm text-[var(--ent-muted)] mt-2 leading-relaxed">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="ent-drawer-close" aria-label="Close">
            ×
          </button>
        </div>
        <div className="ent-drawer-body">{children}</div>
      </aside>
    </div>
  );
}
