import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marketingCanonical, marketingPath } from "../../../../lib/enterprise-marketing/paths";
import { PlatformChrome } from "../../PlatformChrome";
import { PlatformViewTracker } from "../../PlatformViewTracker";
import { StoryKindBadge } from "../SuccessStoryCard";
import { SuccessStoryShare } from "../SuccessStoryShare";
import { SuccessStorySubscribe } from "../SuccessStorySubscribe";
import {
  SUCCESS_STORIES,
  successStoryBySlug,
  type SuccessStory,
} from "../success-stories-data";
import "../success-stories.css";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SUCCESS_STORIES.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = successStoryBySlug(slug);
  if (!story) {
    return { title: "Success story — INTERTEXE" };
  }
  return {
    title: `${story.brand} — Success Story | INTERTEXE`,
    description: story.headline,
    alternates: { canonical: `${marketingCanonical("success-stories")}/${story.slug}` },
  };
}

function DetailBody({ story }: { story: SuccessStory }) {
  return (
    <div className="ss-page">
      <div className="ss-detail">
        <div className="platform-lux-wrap ss-detail-layout">
          <aside className="ss-detail-aside">
            <SuccessStorySubscribe storySlug={story.slug} />
            <SuccessStoryShare title={story.headline} />
          </aside>

          <article className="ss-detail-main">
            <Link href={marketingPath("success-stories")} className="ss-detail-back">
              ← All success stories
            </Link>
            <div className="ss-detail-kicker">
              <p className="ss-detail-brand">{story.brand}</p>
              <StoryKindBadge kind={story.kind} />
            </div>
            <h1 className="ss-detail-title">{story.headline}</h1>

            <div className="ss-metrics">
              {story.metrics.map((metric) => (
                <div key={metric.label} className="ss-metric">
                  <span className="ss-metric-value">{metric.value}</span>
                  <p className="ss-metric-label">{metric.label}</p>
                </div>
              ))}
            </div>

            <blockquote className="ss-quote">
              <p className="ss-quote-text">“{story.quote.text}”</p>
              <footer className="ss-quote-attr">
                {story.quote.name} — {story.quote.role}
              </footer>
            </blockquote>

            <div className="ss-narrative">
              <section>
                <h3>Challenges &amp; Needs</h3>
                <p>{story.challenges}</p>
              </section>
              <section>
                <h3>Solutions</h3>
                <p>{story.solutions}</p>
              </section>
              <section>
                <h3>Key elements of {story.brand}&apos;s approach</h3>
                <ul>
                  {story.keyElements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export default async function SuccessStoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const story = successStoryBySlug(slug);
  if (!story) notFound();

  return (
    <PlatformChrome active="success-stories">
      <PlatformViewTracker event="platform_success_story_view" />
      <DetailBody story={story} />
    </PlatformChrome>
  );
}
