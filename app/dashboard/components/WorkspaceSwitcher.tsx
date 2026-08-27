"use client";

import { usePathname, useRouter } from "next/navigation";
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
  if (contexts.length < 2) return null;

  const current =
    contexts.find((item) => item.href === currentHref) ||
    contexts.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <label className="block mt-3">
      <span className="sr-only">Workspace</span>
      <select
        className="w-full text-xs border border-black/15 rounded-md px-2 py-2 bg-white"
        value={current?.href || currentHref}
        onChange={(event) => {
          router.push(event.target.value);
        }}
      >
        {contexts.map((item) => (
          <option key={item.href} value={item.href}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
