import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

describe("Platform B2B sales page", () => {
  const home = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformHome.tsx"), "utf8");
  const sections = fs.readFileSync(path.join(process.cwd(), "app/platform/sales-sections.tsx"), "utf8");
  const visuals = fs.readFileSync(path.join(process.cwd(), "app/platform/sales-visuals.tsx"), "utf8");
  const chrome = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformChrome.tsx"), "utf8");
  const nav = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformNav.tsx"), "utf8");
  const login = fs.readFileSync(path.join(process.cwd(), "app/platform/login/page.tsx"), "utf8");
  const page = fs.readFileSync(path.join(process.cwd(), "app/platform/page.tsx"), "utf8");
  const form = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformLeadForm.tsx"), "utf8");
  const faq = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformFaq.tsx"), "utf8");

  it("positions INTERTEXE as material intelligence, not DPP-only software", () => {
    assert.match(sections, /Turn product data into material intelligence/);
    assert.match(sections, /INTERTEXE FOR BRANDS/);
    assert.match(sections, /one governed product record/i);
    assert.match(sections, /DPP is an important output/);
    assert.doesNotMatch(sections, /EU certified/i);
    assert.doesNotMatch(sections, /EU approved/i);
    assert.doesNotMatch(sections, /Guaranteed Compliant/);
  });

  it("uses the nine-section B2B hierarchy", () => {
    assert.match(home, /SalesHeroSection/);
    assert.match(home, /SalesProblemSection/);
    assert.match(home, /SalesGovernedRecordSection/);
    assert.match(home, /SalesHowItWorksSection/);
    assert.match(home, /SalesIntelligenceSection/);
    assert.match(home, /SalesDppSection/);
    assert.match(home, /SalesConsumerSection/);
    assert.match(home, /SalesPlatformBreadthSection/);
    assert.match(home, /SalesCtaSection/);
    assert.doesNotMatch(home, /SalesOutcomesSection/);
    assert.doesNotMatch(home, /PricingPlans/);
    assert.doesNotMatch(home, /StoryTabs/);
    assert.doesNotMatch(home, /ComparisonView/);
  });

  it("converts with Request a demo and Sign in to enterprise login", () => {
    assert.match(sections, /href="\/platform\/request\?intent=snapshot&cta=hero"/);
    assert.match(sections, /Request a demo/);
    assert.match(sections, /getEnterpriseLoginUrl/);
    assert.match(nav, /getEnterpriseLoginUrl/);
    assert.match(nav, /Request a demo/);
    assert.match(nav, /Sign in/);
    assert.match(chrome, /getEnterpriseLoginUrl/);
    assert.match(login, /getEnterpriseLoginUrl/);
    assert.match(form, /Free 10-product Material Snapshot/);
  });

  it("centers intelligence and consumer advantage without overclaiming", () => {
    assert.match(sections, /See your catalog differently/);
    assert.match(sections, /IntelligenceBenchmarkVisual/);
    assert.match(sections, /Built on both sides of fashion/);
    assert.match(sections, /never individual tracking/);
    assert.match(sections, /not yet operational/);
    assert.match(sections, /Illustrative example/);
    assert.match(sections, /not fabricated competitor dumps/);
    assert.match(visuals, /Understand/);
    assert.match(visuals, /Publish/);
    assert.doesNotMatch(sections, /150 companies trust us/i);
    assert.doesNotMatch(sections, /being built/i);
  });

  it("uses intelligence-first page metadata", () => {
    assert.match(page, /absolute: "INTERTEXE for Brands \| Product & Material Intelligence for Fashion"/);
    assert.match(page, /Digital Product Passports/);
    assert.match(page, /benchmarks material strategy/i);
  });

  it("keeps FAQ and detailed comparison off the home page", () => {
    assert.match(faq, /does not fabricate product data/i);
    assert.doesNotMatch(home, /PlatformFaq/);
    assert.doesNotMatch(home, /ComparisonView/);
    assert.match(page, /PlatformHome/);
  });

  it("uses native sales visuals instead of editorial PNG decks", () => {
    assert.match(sections, /hero-workspace-desktop\.png/);
    assert.match(sections, /ProblemConvergenceVisual/);
    assert.match(sections, /GovernedRecordVisual/);
    assert.match(sections, /JourneyStepsVisual/);
    assert.match(sections, /PassportIdentityVisual/);
    assert.match(sections, /ConsumerEcosystemVisual/);
    assert.match(sections, /PlatformModuleGrid/);
    assert.doesNotMatch(sections, /PlatformEditorialGraphic/);
    assert.doesNotMatch(sections, /INTERTEXE_01_Data_Architecture/);
    assert.doesNotMatch(sections, /WorkspaceChrome/);
    assert.doesNotMatch(sections, /WorkspaceHeroPreview/);
    assert.doesNotMatch(sections, /DataSourcesVisual/);
    assert.doesNotMatch(sections, /ConsumerBridgeVisual/);
    assert.doesNotMatch(sections, /DppFlow/);
    assert.match(visuals, /Discover · Scan · Compare/);
    assert.doesNotMatch(sections, /leaves/i);
    assert.doesNotMatch(sections, /factory/i);
  });
});
