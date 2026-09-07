"use client";

import { useEffect, useState } from "react";

export function NotificationBell({ organization }: { organization: string }) {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Array<{ id: string; title: string; body: string | null; href: string | null; created_at: string; read_at: string | null }>>([]);

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
      <button type="button" className="ent-icon-btn" aria-label="Notifications" onClick={() => setOpen((v) => !v)}>
        🔔{unread > 0 ? <span className="ml-1 text-xs">{unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-xl border border-[var(--ent-border)] bg-white shadow-lg z-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide">Notifications</p>
            {unread > 0 ? (
              <button type="button" className="text-xs text-[var(--ent-accent)]" onClick={() => void markRead()}>Mark all read</button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-[var(--ent-muted)]">No notifications.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className={`py-2 border-b border-[var(--ent-border)] text-sm ${item.read_at ? "opacity-60" : ""}`}>
                <p className="font-medium">{item.title}</p>
                {item.body ? <p className="text-[var(--ent-muted)] text-xs mt-0.5">{item.body}</p> : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
