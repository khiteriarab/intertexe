import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { SuccessStoryCard } from "./SuccessStoryCard";
import { featuredSuccessStories, gridSuccessStories } from "./success-stories-data";
import "./success-stories.css";

export const metadata: Metadata = {
  title: "Success Stories — INTERTEXE for brands",
  description:
    "See how brands and partners use INTERTEXE to govern product data, prove claims, and publish Digital Product Passports.",
  alternates: { canonical: marketingCanonical("success-stories") },
};

export default function SuccessStoriesPage() {
  const featured = featuredSuccessStories();
  const grid = gridSuccessStories();

  return (
    <PlatformChrome active="success-stories">
      <PlatformViewTracker event="platform_success_stories_view" />
      <div className="ss-page">
        <section className="ss-intro">
          <div className="platform-lux-wrap">
            <h1 className="ss-intro-title">
              Our <em>success stories</em>
            </h1>
            <p className="ss-intro-lede">
              How brands and partners use INTERTEXE to govern product data, prove claims, and publish
              Digital Product Passports — from first record to consumer experience.
            </p>
          </div>
        </section>

        {featured.length > 0 ? (
          <section className="ss-featured" aria-label="Featured success stories">
            <div className="platform-lux-wrap">
              <div className="ss-featured-band">
                {featured.map((story) => (
                  <SuccessStoryCard key={story.slug} story={story} featured />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="ss-grid-section" aria-label="More success stories">
          <div className="platform-lux-wrap">
            <div className="ss-grid">
              {grid.map((story) => (
                <SuccessStoryCard key={story.slug} story={story} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </PlatformChrome>
  );
}
