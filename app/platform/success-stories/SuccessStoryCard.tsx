"use client";

import Link from "next/link";
import type { SuccessStory } from "./success-stories-data";
import { successStoryPath } from "./success-stories-data";
import { SERIF } from "../platform-ui";

export function StoryKindBadge({ kind }: { kind: SuccessStory["kind"] }) {
  return <span className={`ss-badge ss-badge--${kind}`}>{kind === "partner" ? "Partner" : "Client"}</span>;
}

export function SuccessStoryCard({
  story,
  featured = false,
}: {
  story: SuccessStory;
  featured?: boolean;
}) {
  const href = successStoryPath(story.slug);

  if (featured) {
    return (
      <article className="ss-card ss-card--featured">
        <Link href={href} className="ss-card-media">
          <img src={story.image} alt="" width={960} height={640} />
          <span className="ss-card-logo">{story.logoLabel}</span>
        </Link>
        <div className="ss-card-body">
          <h2 className="ss-card-title" style={SERIF}>
            <Link href={href}>{story.headline}</Link>
          </h2>
          <p className="ss-card-brand">{story.brand}</p>
          <StoryKindBadge kind={story.kind} />
          <Link href={href} className="ss-card-cta">
            Read more <span aria-hidden>→</span>
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="ss-card">
      <Link href={href} className="ss-card-media">
        <img src={story.image} alt="" width={960} height={640} />
        <span className="ss-card-logo">{story.logoLabel}</span>
        <span className="ss-card-badge-slot">
          <StoryKindBadge kind={story.kind} />
        </span>
      </Link>
      <div className="ss-card-body">
        <h2 className="ss-card-title" style={SERIF}>
          <Link href={href}>{story.headline}</Link>
        </h2>
        <div className="ss-card-meta">
          <p className="ss-card-brand">{story.brand}</p>
          <Link href={href} className="ss-card-cta">
            Read more <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
