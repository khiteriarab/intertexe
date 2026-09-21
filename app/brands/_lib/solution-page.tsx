import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PlatformChrome } from "../../platform/PlatformChrome";
import { PlatformViewTracker } from "../../platform/PlatformViewTracker";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink, SERIF } from "../../platform/platform-ui";
import { SOLUTIONS, type SolutionCard } from "../../platform/solutions/solutions-data";
import { marketingCanonical, marketingPath } from "../../../lib/enterprise-marketing/paths";
import "../../platform/solutions/solutions.css";

const SEGMENT_TO_KEY: Record<string, string> = {
  "product-intelligence": "product-intelligence",
  traceability: "traceability",
  "environmental-intelligence": "environmental",
  "digital-product-passport": "passport",
  "connected-product-lifecycle": "lifecycle",
  "supplier-data": "supplier",
};

export function solutionCardForSegment(segment: string): SolutionCard | null {
  const key = SEGMENT_TO_KEY[segment];
  if (!key) return null;
  return SOLUTIONS.find((s) => s.key === key) || null;
}

export function solutionMetadata(segment: keyof typeof SEGMENT_TO_KEY): Metadata {
  const card = solutionCardForSegment(segment);
  const title = card ? `${card.label} — INTERTEXE for Brands` : "Solutions — INTERTEXE for Brands";
  const description = card?.proposition || card?.description || "INTERTEXE enterprise solutions for fashion brands.";
  return {
    title,
    description,
    alternates: { canonical: marketingCanonical(segment) },
  };
}

export function SolutionDetailPage({ segment }: { segment: string }) {
  const card = solutionCardForSegment(segment);
  if (!card) {
    return (
      <PlatformChrome active="solutions">
        <section className="platform-lux-wrap py-24">
          <Heading>Solution not found</Heading>
          <PrimaryLink href={marketingPath("solutions")}>Back to solutions</PrimaryLink>
        </section>
      </PlatformChrome>
    );
  }

  return (
    <PlatformChrome active="solutions">
      <PlatformViewTracker event="platform_solutions_view" />

      <section className="solution-detail">
        <div className="platform-lux-wrap">
          <div className="solution-detail-grid">
            <div className="solution-detail-copy">
              <p className="solution-detail-back">
                <Link href={marketingPath("solutions")}>← All solutions</Link>
              </p>
              <Eyebrow>{card.label}</Eyebrow>
              <Heading className="mb-4">{card.title}</Heading>
              <p className="solution-detail-proposition">{card.proposition}</p>
              {card.detail.map((paragraph) => (
                <Body key={paragraph.slice(0, 48)} className="mb-4">
                  {paragraph}
                </Body>
              ))}

              <div className="solution-detail-block">
                <h3 className="solution-detail-block-title" style={SERIF}>
                  What you get
                </h3>
                <ul className="solution-detail-list">
                  {card.get.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="solution-detail-block">
                <h3 className="solution-detail-block-title" style={SERIF}>
                  Why it matters
                </h3>
                <Body className="mb-0">{card.why}</Body>
              </div>

              <div className="solution-detail-actions">
                <PrimaryLink href={card.cta.href}>{card.cta.label}</PrimaryLink>
                {card.cta.href.includes("/demo") ? (
                  <SecondaryLink href={marketingPath("request?intent=demo&cta=solution_detail")}>
                    Request a demo
                  </SecondaryLink>
                ) : (
                  <SecondaryLink href={marketingPath("demo")}>See it live</SecondaryLink>
                )}
              </div>
            </div>

            <aside className="solution-detail-visual">
              <Image
                src={card.visual}
                alt={card.visualAlt}
                width={960}
                height={720}
                className="solution-detail-image"
                sizes="(max-width: 899px) 92vw, 42vw"
                unoptimized
              />
            </aside>
          </div>
        </div>
      </section>
    </PlatformChrome>
  );
}
