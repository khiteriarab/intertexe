import type { Metadata } from "next";
import Link from "next/link";
import { PlatformChrome } from "../../platform/PlatformChrome";
import { PlatformViewTracker } from "../../platform/PlatformViewTracker";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink } from "../../platform/platform-ui";
import { SOLUTIONS, type SolutionCard } from "../../platform/solutions/solutions-data";
import { marketingCanonical, marketingPath } from "../../../lib/enterprise-marketing/paths";
import "../../platform/solutions/solutions.css";

const SEGMENT_TO_KEY: Record<string, string> = {
  "product-intelligence": "product-intelligence",
  traceability: "traceability",
  "environmental-intelligence": "environmental",
  "digital-product-passport": "passport",
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
  const description = card?.description || "INTERTEXE enterprise solutions for fashion brands.";
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
      <section className="solutions-intro">
        <div className="platform-lux-wrap">
          <div className="solutions-intro-copy max-w-3xl">
            <Eyebrow>{card.label}</Eyebrow>
            <Heading className="mb-5">
              {card.title}
            </Heading>
            <Body className="mb-8">{card.description}</Body>
            <ul className="solution-card-tags mb-10">
              {card.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            <div className="solutions-intro-actions">
              <PrimaryLink href={marketingPath("demo")}>See it live</PrimaryLink>
              <SecondaryLink href={marketingPath("request?intent=snapshot&cta=solution_detail")}>
                Request a demo
              </SecondaryLink>
            </div>
            <p className="mt-10 text-sm text-[var(--platform-quiet)]">
              <Link href={marketingPath("solutions")} className="underline underline-offset-4">
                ← All solutions
              </Link>
            </p>
          </div>
        </div>
      </section>
    </PlatformChrome>
  );
}
