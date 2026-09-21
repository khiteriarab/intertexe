import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

describe("Platform success stories", () => {
  const listing = fs.readFileSync(path.join(process.cwd(), "app/platform/success-stories/page.tsx"), "utf8");
  const detail = fs.readFileSync(
    path.join(process.cwd(), "app/platform/success-stories/[slug]/page.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(path.join(process.cwd(), "app/platform/success-stories/success-stories.css"), "utf8");
  const nav = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformNav.tsx"), "utf8");
  const chrome = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformChrome.tsx"), "utf8");
  const paths = fs.readFileSync(path.join(process.cwd(), "lib/enterprise-marketing/paths.ts"), "utf8");

  it("shows a Fall 2026 coming-soon page with demo CTAs", () => {
    assert.match(listing, /Case studies coming/);
    assert.match(listing, /Fall 2026/);
    assert.match(listing, /Interested in being a case study/);
    assert.match(listing, /Start a free demo/);
    assert.match(listing, /request\?intent=snapshot&cta=success_stories_coming/);
    assert.match(listing, /See it live/);
    assert.doesNotMatch(listing, /SuccessStoryCard|featuredSuccessStories|Atelier Nord/);
    assert.match(css, /\.ss-coming/);
  });

  it("redirects placeholder story slugs until real case studies publish", () => {
    assert.match(detail, /redirect/);
    assert.match(detail, /success-stories/);
  });

  it("keeps Success Stories in nav, footer, and reserved marketing paths", () => {
    assert.match(paths, /"success-stories"/);
    assert.match(nav, /marketingPath\("success-stories"\)/);
    assert.match(nav, /label: "Success Stories"/);
    assert.match(chrome, /marketingPath\("success-stories"\)/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "app/brands/success-stories/page.tsx")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "app/brands/success-stories/[slug]/page.tsx")));
  });
});
