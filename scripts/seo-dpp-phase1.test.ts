/**
 * SEO Phase 1 — B2B / Digital Product Passport technical layer.
 * Run: node --import tsx --test scripts/seo-dpp-phase1.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("SEO Phase 1 — DPP / B2B", () => {
  it("publishes a dedicated /digital-product-passport landing page", () => {
    const page = fs.readFileSync(path.join(root, "app/digital-product-passport/page.tsx"), "utf8");
    assert.match(page, /Digital Product Passport software built for fashion/);
    assert.match(page, /Digital Product Passport Software for Fashion \| INTERTEXE/);
    assert.match(page, /Create, govern and publish Digital Product Passports/);
    assert.match(page, /Textile-specific[\s\S]*requirements are still being finalized/);
    assert.match(page, /FAQPage|faqPageJsonLd/);
    assert.match(page, /SoftwareApplication|softwareApplicationJsonLd/);
    assert.match(page, /What is a Digital Product Passport\?/);
    assert.match(page, /Are Digital Product Passports already mandatory/);
    assert.match(page, /href="\/brands\/demo"/);
    assert.match(page, /href="\/brands"/);
    assert.doesNotMatch(page, /display:\s*none|visibility:\s*hidden/);
  });

  it("canonicalizes brands DPP to the SEO landing and updates sitemap/robots", () => {
    const brandsDpp = fs.readFileSync(path.join(root, "app/brands/digital-product-passport/page.tsx"), "utf8");
    const sitemap = fs.readFileSync(path.join(root, "app/sitemap.ts"), "utf8");
    const robots = fs.readFileSync(path.join(root, "public/robots.txt"), "utf8");
    const nextConfig = fs.readFileSync(path.join(root, "next.config.js"), "utf8");
    assert.match(brandsDpp, /redirect\(["']\/digital-product-passport/);
    assert.match(sitemap, /\/digital-product-passport/);
    assert.match(sitemap, /\/brands`/);
    assert.match(sitemap, /\/designers/);
    assert.doesNotMatch(sitemap, /\/brands\/digital-product-passport/);
    assert.match(robots, /Sitemap: https:\/\/www\.intertexe\.com\/sitemap\.xml/);
    assert.match(robots, /Disallow: \/dashboard/);
    assert.match(nextConfig, /source:\s*["']\/brands\/digital-product-passport["']/);
  });

  it("gives B2B pages unique titles without changing consumer root defaults", () => {
    const brands = fs.readFileSync(path.join(root, "app/brands/page.tsx"), "utf8");
    const demo = fs.readFileSync(path.join(root, "app/brands/demo/page.tsx"), "utf8");
    const pricing = fs.readFileSync(path.join(root, "app/brands/pricing/page.tsx"), "utf8");
    const rootLayout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");
    assert.match(brands, /Material Intelligence Platform for Fashion/);
    assert.match(demo, /Fashion Digital Product Passport Demo/);
    assert.match(pricing, /INTERTEXE Pricing \| Fashion Material Intelligence/);
    assert.match(rootLayout, /Natural Fiber Fashion Discovery/);
    assert.match(rootLayout, /Digital Product Passport/);
  });

  it("keeps dashboard noindex and adds internal DPP links from platform surfaces", () => {
    const dash = fs.readFileSync(path.join(root, "app/dashboard/layout.tsx"), "utf8");
    const how = fs.readFileSync(path.join(root, "app/platform/PlatformHowItWorksSection.tsx"), "utf8");
    const solutions = fs.readFileSync(path.join(root, "app/platform/solutions/page.tsx"), "utf8");
    const about = fs.readFileSync(path.join(root, "app/about/page.tsx"), "utf8");
    assert.match(dash, /index:\s*false/);
    assert.match(how, /\/digital-product-passport/);
    assert.match(solutions, /\/digital-product-passport/);
    assert.match(about, /\/digital-product-passport/);
  });
});
