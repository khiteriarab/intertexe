"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ENTERPRISE_NAV_GROUPS } from "../../../lib/enterprise/constants";
import { ENT_NAV_GROUP_ICONS, ENT_NAV_ITEM_ICONS, EntIconChevron } from "./EnterpriseNavIcons";

function navItemActive(pathname: string, base: string, href: string, exact?: boolean) {
  const target = `${base}${href}`;
  return exact ? pathname === target || pathname === base : pathname === target || pathname.startsWith(`${target}/`);
}

export function EnterpriseNav({
  base,
  onNavigate,
}: {
  base: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const activeGroupId = useMemo(() => {
    for (const group of ENTERPRISE_NAV_GROUPS) {
      if (group.items.some((item) => navItemActive(pathname, base, item.href, "exact" in item && item.exact))) {
        return group.id;
      }
    }
    return "core";
  }, [pathname, base]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      for (const group of ENTERPRISE_NAV_GROUPS) {
        if (next[group.id] === undefined) {
          next[group.id] = group.id === activeGroupId;
        }
      }
      next[activeGroupId] = true;
      return next;
    });
  }, [activeGroupId]);

  function toggleGroup(id: string) {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <nav className="flex-1 px-3 py-3 overflow-y-auto" aria-label="Organization">
      {ENTERPRISE_NAV_GROUPS.map((group, groupIndex) => {
        const GroupIcon = ENT_NAV_GROUP_ICONS[group.icon];
        const isOpen = openGroups[group.id] ?? group.id === activeGroupId;
        const groupActive = group.id === activeGroupId;

        return (
          <div key={group.id} className={groupIndex > 0 ? "mt-2" : ""}>
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className={`ent-nav-group-trigger w-full ${groupActive ? "ent-nav-group-trigger-active" : ""}`}
              aria-expanded={isOpen}
            >
              <span className="ent-nav-icon ent-nav-icon-group">
                <GroupIcon className="h-[15px] w-[15px]" />
              </span>
              <span className="flex-1 text-left">{group.label}</span>
              <EntIconChevron className="opacity-60" open={isOpen} />
            </button>

            {isOpen ? (
              <ul className="mt-1 mb-2 space-y-0.5">
                {group.items.map((item) => {
                  const href = `${base}${item.href}`;
                  const active = navItemActive(pathname, base, item.href, "exact" in item && item.exact);
                  const ItemIcon = ENT_NAV_ITEM_ICONS[item.icon];
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        className={`ent-nav-link ${active ? "ent-nav-link-active" : ""}`}
                      >
                        <span className={`ent-nav-icon ${active ? "ent-nav-icon-active" : ""}`}>
                          <ItemIcon className="h-[16px] w-[16px]" />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
