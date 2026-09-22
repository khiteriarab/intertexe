"use client";

import Link from "next/link";
import { ENT_NAV_GROUP_ICONS, ENT_NAV_ITEM_ICONS } from "../../dashboard/components/EnterpriseNavIcons";
import { SERIF } from "../platform-ui";
import { SOLUTIONS, type SolutionCard } from "./solutions-data";

const SOLUTION_ICONS = {
  ...ENT_NAV_ITEM_ICONS,
  ...ENT_NAV_GROUP_ICONS,
} as const;

function SolutionCardBlock({
  card,
  size = "standard",
}: {
  card: SolutionCard;
  size?: "feature" | "standard";
}) {
  const Icon = SOLUTION_ICONS[card.icon];
  return (
    <Link href={card.href} className={`solution-card solution-card--${size}`}>
      <span className="solution-card-icon" aria-hidden>
        <Icon />
      </span>
      <p className="solution-card-label">{card.label}</p>
      <h3 className="solution-card-title" style={SERIF}>
        {card.title}
      </h3>
      <p className="solution-card-copy">{card.description}</p>
      <ul className="solution-card-tags">
        {card.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <span className="solution-card-cta">
        Explore solution
        <span className="solution-card-arrow" aria-hidden>
          →
        </span>
      </span>
    </Link>
  );
}

/** Existing asymmetric Solutions grid. Explore navigates to the in-depth solution page. */
export function SolutionsExploreGrid() {
  const [feature, traceability, environmental, ...rest] = SOLUTIONS;

  return (
    <>
      <div className="solutions-grid solutions-grid--lead">
        <SolutionCardBlock card={feature} size="feature" />
        <div className="solutions-grid-stack">
          <SolutionCardBlock card={traceability} />
          <SolutionCardBlock card={environmental} />
        </div>
      </div>

      <div className="solutions-grid solutions-grid--rest">
        {rest.map((card) => (
          <SolutionCardBlock key={card.key} card={card} />
        ))}
      </div>
    </>
  );
}
