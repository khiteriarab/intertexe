import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { OG_IMAGE } from "../lib/seo-international.ts";
import { HOMEPAGE_HERO_IMAGE_DESKTOP, HOMEPAGE_HERO_SLIDES } from "../lib/editorial-assets.ts";

describe("INTERTEXE share image", () => {
  it("uses the approved homepage hero, not a homepage screenshot", () => {
    assert.match(OG_IMAGE.url, /\/og-image\.jpg/);
    assert.equal(OG_IMAGE.width, 1200);
    assert.equal(OG_IMAGE.height, 630);
    assert.doesNotMatch(OG_IMAGE.alt, /17,553|Shop Natural Fabrics/i);
    assert.match(HOMEPAGE_HERO_IMAGE_DESKTOP, /hero-editorial\.jpg/);
    assert.ok(HOMEPAGE_HERO_SLIDES.some((slide) => /hero-editorial/.test(slide.url)));
  });

  it("ships a 1200x630 og-image built from the studio hero", () => {
    const file = path.join(process.cwd(), "public/og-image.jpg");
    assert.equal(fs.existsSync(file), true);
    const buf = fs.readFileSync(file);
    assert.ok(buf.length > 20_000);
    assert.equal(buf[0], 0xff);
    assert.equal(buf[1], 0xd8);
  });
});
