"use client";

import { useEffect, useState } from "react";
import { EntIconBell } from "./EnterpriseNavIcons";

export function NotificationBell({ organization }: { organization: string }) {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<
    Array<{ id: string; title: string; body: string | null; href: string | null; created_at: string; read_at: string | null }>
  >([]);

  useEffect(() => {
    void fetch(`/api/dashboard/org/${organization}/notifications`)
      .then((r) => r.json())
      .then((d) => {
        setUnread(d.unread || 0);
        setItems(d.items || []);
      });
  }, [organization]);

  async function markRead() {
    await fetch(`/api/dashboard/org/${organization}/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, read_at: new Date().toISOString() })));
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="ent-topbar-icon-btn relative"
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <EntIconBell className="h-[18px] w-[18px]" />
        {unread > 0 ? (
          <span className="ent-topbar-badge" aria-hidden>
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-xl border border-[var(--ent-border)] bg-white shadow-lg z-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ent-ink)]">Notifications</p>
              {unread > 0 ? (
                <button type="button" className="text-xs text-[var(--ent-accent)] hover:underline" onClick={() => void markRead()}>
                  Mark all read
                </button>
              ) : null}
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-[var(--ent-muted)]">No notifications.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className={`py-2 border-b border-[var(--ent-border)] text-sm last:border-0 ${item.read_at ? "opacity-60" : ""}`}>
                  <p className="font-medium text-[var(--ent-ink)]">{item.title}</p>
                  {item.body ? <p className="text-[var(--ent-muted)] text-xs mt-0.5">{item.body}</p> : null}
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
