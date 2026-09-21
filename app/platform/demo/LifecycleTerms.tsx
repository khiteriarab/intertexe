"use client";

import Link from "next/link";
import type { LifecycleTerm } from "./lifecycle-data";

export function LifecycleTerms({
  terms,
  visible,
}: {
  terms: LifecycleTerm[];
  visible: boolean;
}) {
  return (
    <ul className={`plc-terms${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
      {terms.map((term) => {
        if (term.href) {
          return (
            <li key={term.label}>
              <Link href={term.href} className="plc-term is-link">
                <span>{term.label}</span>
                <span className="plc-term-arrow" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          );
        }
        return (
          <li key={term.label}>
            <span className="plc-term">{term.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
