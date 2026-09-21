import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  SUCCESS_STORIES,
  featuredSuccessStories,
  gridSuccessStories,
  successStoryBySlug,
  successStoryPath,
} from "../app/platform/success-stories/success-stories-data";

describe("Platform success stories", () => {
  const listing = fs.readFileSync(path.join(process.cwd(), "app/platform/success-stories/page.tsx"), "utf8");
  const detail = fs.readFileSync(
    path.join(process.cwd(), "app/platform/success-stories/[slug]/page.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(path.join(process.cwd(), "app/platform/success-stories/success-stories.css"), "utf8");
  const card = fs.readFileSync(path.join(process.cwd(), "app/platform/success-stories/SuccessStoryCard.tsx"), "utf8");
  const subscribe = fs.readFileSync(
    path.join(process.cwd(), "app/platform/success-stories/SuccessStorySubscribe.tsx"),
    "utf8",
  );
  const nav = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformNav.tsx"), "utf8");
  const chrome = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformChrome.tsx"), "utf8");
  const paths = fs.readFileSync(path.join(process.cwd(), "lib/enterprise-marketing/paths.ts"), "utf8");

  it("exposes Partner and Client placeholder stories with metrics and quotes", () => {
    assert.ok(SUCCESS_STORIES.length >= 5);
    assert.ok(SUCCESS_STORIES.some((s) => s.kind === "partner"));
    assert.ok(SUCCESS_STORIES.some((s) => s.kind === "client"));
    assert.equal(featuredSuccessStories().length, 2);
    assert.ok(gridSuccessStories().length >= 3);
    for (const story of SUCCESS_STORIES) {
      assert.ok(story.metrics.length >= 2, `${story.slug} needs metrics`);
      assert.ok(story.quote.text.length > 40, `${story.slug} needs a quote`);
      assert.ok(story.keyElements.length >= 3, `${story.slug} needs key elements`);
      assert.equal(successStoryBySlug(story.slug)?.slug, story.slug);
      assert.match(successStoryPath(story.slug), /\/brands\/success-stories\//);
    }
  });

  it("lists featured and grid cards with Partner/Client badges", () => {
    assert.match(listing, /Our <em>success stories<\/em>/);
    assert.match(listing, /featuredSuccessStories/);
    assert.match(listing, /gridSuccessStories/);
    assert.match(listing, /SuccessStoryCard/);
    assert.match(card, /Partner/);
    assert.match(card, /Client/);
    assert.match(card, /ss-badge--partner|ss-badge--\$\{kind\}/);
    assert.match(card, /Read more/);
  });

  it("detail page pairs narrative with newsletter subscription", () => {
    assert.match(detail, /SuccessStorySubscribe/);
    assert.match(detail, /Challenges/);
    assert.match(detail, /Solutions/);
    assert.match(detail, /ss-metrics/);
    assert.match(subscribe, /\/api\/v1\/leads/);
    assert.match(subscribe, /intent: "ebook"/);
    assert.match(subscribe, /success_story_/);
    assert.match(css, /\.ss-subscribe/);
    assert.match(css, /\.ss-detail-aside/);
  });

  it("wires Success Stories into nav, footer, and reserved marketing paths", () => {
    assert.match(paths, /"success-stories"/);
    assert.match(nav, /marketingPath\("success-stories"\)/);
    assert.match(nav, /label: "Success Stories"/);
    assert.match(nav, /"success-stories"/);
    assert.match(chrome, /marketingPath\("success-stories"\)/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "app/brands/success-stories/page.tsx")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "app/brands/success-stories/[slug]/page.tsx")));
  });
});
