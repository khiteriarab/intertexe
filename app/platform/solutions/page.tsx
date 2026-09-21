import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";
import Link from "next/link";
import { ENT_NAV_GROUP_ICONS, ENT_NAV_ITEM_ICONS } from "../../dashboard/components/EnterpriseNavIcons";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { SolutionsClose } from "../SolutionsClose";
import { Body, Eyebrow, Heading, SERIF } from "../platform-ui";
import { SOLUTIONS, type SolutionCard } from "./solutions-data";
import "./solutions.css";

export const metadata: Metadata = {
  title: "Solutions — one product record, six ways to use it",
  description:
    "INTERTEXE connects product creation, traceability, environmental intelligence, compliance, consumer transparency, and next-life experiences through one governed product record.",
  alternates: { canonical: marketingCanonical("solutions") },
};

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

export default function PlatformSolutionsPage() {
  const [feature, traceability, environmental, ...rest] = SOLUTIONS;

  return (
    <PlatformChrome active="solutions">
      <PlatformViewTracker event="platform_solutions_view" />

      <section className="solutions-intro">
        <div className="platform-lux-wrap">
          <div className="solutions-intro-copy">
            <Eyebrow>Solutions</Eyebrow>
            <Heading className="mb-5">One product record. Six ways to use it.</Heading>
            <Body className="mb-8">
              INTERTEXE connects product creation, traceability, environmental intelligence, compliance, consumer
              transparency, and next-life experiences through one governed product record.
            </Body>
            <div className="solutions-intro-actions">
              <Link href="/brands" className="solutions-cta-primary">
                Explore the platform
                <span aria-hidden>→</span>
              </Link>
              <Link href="/brands/demo" className="solutions-cta-secondary">
                See it live
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="solutions-grid-section">
        <div className="platform-lux-wrap">
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
        </div>
      </section>

      <SolutionsClose cta="solutions_close" />
    </PlatformChrome>
  );
}
