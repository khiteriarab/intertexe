import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { Body, Eyebrow, Heading, SERIF } from "../platform-ui";
import { LIFECYCLE_STAGES, SOLUTIONS } from "./solutions-data";
import "./solutions.css";

export const metadata: Metadata = {
  title: "Solutions — one product record, six ways to use it",
  description:
    "INTERTEXE connects product creation, traceability, environmental intelligence, compliance, consumer transparency, and next-life experiences through one governed product record.",
  alternates: { canonical: "https://www.intertexe.com/platform/solutions" },
};

function SolutionCardBlock({
  card,
  size = "standard",
}: {
  card: (typeof SOLUTIONS)[number];
  size?: "feature" | "standard";
}) {
  return (
    <Link href={card.href} className={`solution-card solution-card--${size}`}>
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
              <Link href="/platform" className="solutions-cta-primary">
                Explore the platform
                <span aria-hidden>→</span>
              </Link>
              <Link href="/platform/demo" className="solutions-cta-secondary">
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

      <section className="solutions-dark">
        <div className="platform-lux-wrap">
          <div className="solutions-dark-copy">
            <h2 className="solutions-dark-title" style={SERIF}>
              One governed record. Every stage connected.
            </h2>
            <p className="solutions-dark-body">
              The same product data powers traceability, compliance, environmental intelligence, consumer experiences,
              and next-life services without rebuilding the record for every use case.
            </p>
          </div>

          <ol className="solutions-lifecycle">
            {LIFECYCLE_STAGES.map((item, index) => (
              <li key={item.stage}>
                <span className="solutions-lifecycle-stage">{item.stage}</span>
                <span className="solutions-lifecycle-label">{item.label}</span>
                {index < LIFECYCLE_STAGES.length - 1 ? (
                  <span className="solutions-lifecycle-arrow" aria-hidden>
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="solutions-shot">
            <Image
              src="/platform/solutions-governed-record.png"
              alt="INTERTEXE consumer passport on mobile beside the product Impact workspace on desktop."
              width={1672}
              height={941}
              className="solutions-shot-main"
              sizes="(max-width: 899px) 94vw, 1100px"
            />
          </div>
        </div>
      </section>

      <section className="solutions-close">
        <div className="platform-lux-wrap solutions-close-inner">
          <div>
            <Eyebrow>One platform</Eyebrow>
            <Heading className="mb-4">Start with the problem you need to solve.</Heading>
            <Body className="mb-0">
              Use one INTERTEXE solution or connect several around the same governed product record.
            </Body>
          </div>
          <div className="solutions-close-actions">
            <Link href="/platform" className="solutions-cta-primary">
              Explore the platform
              <span aria-hidden>→</span>
            </Link>
            <Link href="/platform/request?intent=snapshot&cta=solutions" className="solutions-cta-secondary">
              Request a demo
            </Link>
          </div>
        </div>
      </section>
    </PlatformChrome>
  );
}
