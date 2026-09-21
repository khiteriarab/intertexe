/**
 * Domain clarity — consumer fashion brands vs enterprise organizations.
 * Run: node --import tsx --test scripts/brand-domain-clarity.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("Brand domain naming clarity", () => {
  it("exposes explicit consumer and obelisk Supabase clients", () => {
    const consumer = fs.readFileSync(path.join(root, "lib/supabase-service-client.ts"), "utf8");
    const enterprise = fs.readFileSync(path.join(root, "lib/enterprise/client.ts"), "utf8");
    assert.match(consumer, /export function getConsumerSupabase/);
    assert.match(consumer, /getServerSupabase/);
    assert.match(enterprise, /export function getObeliskServiceClient/);
    assert.match(enterprise, /export function getObeliskUserClient/);
    assert.match(enterprise, /getEnterpriseServiceClient/);
  });

  it("keeps enterprise operators named as organizations", () => {
    const provision = fs.readFileSync(
      path.join(root, "lib/enterprise/provision-organization-operator.ts"),
      "utf8",
    );
    const constants = fs.readFileSync(path.join(root, "lib/enterprise/constants.ts"), "utf8");
    assert.match(provision, /provisionOrganizationOperator/);
    assert.match(constants, /DEMO_ORGANIZATION_SLUG/);
    assert.match(constants, /DEMO_BRAND_SLUG = DEMO_ORGANIZATION_SLUG/);
  });

  it("separates /designers (consumer) from /brands (enterprise marketing)", () => {
    const designers = fs.readFileSync(path.join(root, "app/designers/page.tsx"), "utf8");
    const brands = fs.readFileSync(path.join(root, "app/brands/page.tsx"), "utf8");
    const paths = fs.readFileSync(path.join(root, "lib/enterprise-marketing/paths.ts"), "utf8");
    assert.doesNotMatch(designers, /redirect\(["']\/brands/);
    assert.doesNotMatch(brands, /redirect\(["']\/designers/);
    assert.match(brands, /marketingCanonical|PlatformHome|PlatformChrome/);
    assert.match(paths, /MARKETING_BASE = "\/brands"/);
  });

  it("does not cross-redirect designers and brands in next.config", () => {
    const nextConfig = fs.readFileSync(path.join(root, "next.config.js"), "utf8");
    assert.doesNotMatch(nextConfig, /source:\s*["']\/designers["'][\s\S]*destination:\s*["']\/brands/);
    assert.doesNotMatch(nextConfig, /source:\s*["']\/brands["'][\s\S]*destination:\s*["']\/designers/);
  });

  it("indexes /brands marketing URLs and keeps /designers in sitemap", () => {
    const sitemap = fs.readFileSync(path.join(root, "app/sitemap.ts"), "utf8");
    assert.match(sitemap, /\/designers/);
    assert.match(sitemap, /\/brands`/);
    assert.match(sitemap, /\/brands\/demo/);
    assert.doesNotMatch(sitemap, /\/platform`/);
  });

  it("keeps consumer brand profiles as fashion-brand vocabulary (not organizations)", () => {
    const profiles = fs.readFileSync(path.join(root, "lib/brand-profiles.ts"), "utf8");
    assert.match(profiles, /BrandProfile|ConsumerBrandProfile/);
    assert.match(profiles, /getBrandProfile|getConsumerBrandProfile/);
    assert.doesNotMatch(profiles, /OrganizationProfile|getOrganizationProfile/);
  });

  it("treats fashion brands and SaaS organizations as separate entities", () => {
    const audit = fs.readFileSync(path.join(root, "docs/brand-domain-naming-audit.md"), "utf8");
    assert.match(audit, /shopper-facing fashion brand is \*\*not\*\* an enterprise organization/i);
    assert.match(audit, /must \*\*not\*\* share routing, auth assumptions, or database clients/i);
    assert.match(audit, /Do not\*\* perform global|perform global `brand` → `organization`/i);
  });

  it("routes HQ retail analytics away from /brands marketing path", () => {
    const legacy = fs.readFileSync(path.join(root, "app/dashboard/(app)/brands/page.tsx"), "utf8");
    const retail = fs.readFileSync(path.join(root, "app/dashboard/(app)/retail-brands/page.tsx"), "utf8");
    assert.match(legacy, /redirect\(["']\/dashboard\/retail-brands/);
    assert.match(retail, /Retail Brand Intelligence/);
    assert.match(retail, /not SaaS organization/);
  });

  it("exposes a top-level architecture map for new engineers", () => {
    const arch = fs.readFileSync(path.join(root, "docs/architecture.md"), "utf8");
    assert.match(arch, /getConsumerSupabase/);
    assert.match(arch, /getObeliskServiceClient/);
    assert.match(arch, /Where new code should go/);
    assert.match(arch, /\/brands/);
    assert.match(arch, /\/designers/);
  });
});
