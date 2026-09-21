"use client";

import Link from "next/link";
import type { LifecycleChip } from "./lifecycle-data";

export function LifecycleChips({
  chips,
  active,
}: {
  chips: LifecycleChip[];
  active: boolean;
}) {
  return (
    <ul className={`plc-chips${active ? " is-active" : ""}`}>
      {chips.map((chip) => {
        const className = "plc-chip";
        if (chip.href) {
          return (
            <li key={chip.label}>
              <Link href={chip.href} className={`${className} is-link`}>
                <span>{chip.label}</span>
                <span className="plc-chip-arrow" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          );
        }
        return (
          <li key={chip.label}>
            <span className={className}>{chip.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
