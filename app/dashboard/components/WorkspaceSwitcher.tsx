"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { WorkspaceContext } from "../../../lib/enterprise/types";

export function WorkspaceSwitcher({
  contexts,
  currentHref,
}: {
  contexts: WorkspaceContext[];
  currentHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (contexts.length < 2) return null;

  const current =
    contexts.find((item) => item.href === currentHref) ||
    contexts.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  async function onChange(href: string) {
    setError(null);
    const next = contexts.find((item) => item.href === href);
    if (next?.type === "org") {
      setPending(true);
      const res = await fetch("/api/dashboard/workspace/enter-enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: next.slug }),
      });
      const data = await res.json().catch(() => ({}));
      setPending(false);
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Could not open that workspace.");
        return;
      }
    }
    router.push(href);
    router.refresh();
  }

  return (
    <label className="block mt-3">
      <span className="sr-only">Workspace</span>
      <select
        className="w-full text-xs border border-black/15 rounded-md px-2 py-2 bg-white"
        value={current?.href || currentHref}
        disabled={pending}
        onChange={(event) => {
          void onChange(event.target.value);
        }}
      >
        {contexts.map((item) => (
          <option key={item.href} value={item.href}>
            {item.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-[11px] text-red-700">{error}</p> : null}
    </label>
  );
}
