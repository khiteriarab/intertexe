import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

describe("Platform B2B sales page", () => {
  const home = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformHome.tsx"), "utf8");
  const sections = fs.readFileSync(path.join(process.cwd(), "app/platform/sales-sections.tsx"), "utf8");
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

  it("uses the ten-section B2B hierarchy", () => {
    assert.match(home, /SalesHeroSection/);
    assert.match(home, /SalesProblemSection/);
    assert.match(home, /SalesGovernedRecordSection/);
    assert.match(home, /SalesHowItWorksSection/);
    assert.match(home, /SalesOutcomesSection/);
    assert.match(home, /SalesIntelligenceSection/);
    assert.match(home, /SalesDppSection/);
    assert.match(home, /SalesConsumerSection/);
    assert.match(home, /SalesPlatformBreadthSection/);
    assert.match(home, /SalesCtaSection/);
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
    assert.match(sections, /BenchmarkPreview/);
    assert.match(sections, /Built on both sides of fashion/);
    assert.match(sections, /without individual tracking/);
    assert.match(sections, /without claiming live enterprise intelligence/);
    assert.match(sections, /Illustrative example/);
    assert.match(sections, /not fabricated competitor dumps/);
    assert.doesNotMatch(sections, /150 companies trust us/i);
  });

  it("keeps FAQ and detailed comparison off the home page", () => {
    assert.match(faq, /does not fabricate product data/i);
    assert.doesNotMatch(home, /PlatformFaq/);
    assert.doesNotMatch(home, /ComparisonView/);
    assert.match(page, /PlatformHome/);
  });

  it("uses dashboard visuals, not stock sustainability imagery", () => {
    assert.match(sections, /hero-workspace-desktop\.png/);
    assert.match(sections, /NormalizePreview/);
    assert.match(sections, /IssuesPreview/);
    assert.match(sections, /PassportPreview/);
    assert.match(sections, /WorkspaceChrome/);
    assert.doesNotMatch(sections, /leaves/i);
    assert.doesNotMatch(sections, /factory/i);
  });

  it("adds editorial graphics without replacing existing charts", () => {
    assert.match(sections, /PlatformEditorialGraphic/);
    assert.match(sections, /INTERTEXE_01_Data_Architecture\.png/);
    assert.match(sections, /INTERTEXE_02_Product_Data_Journey\.png/);
    assert.match(sections, /INTERTEXE_03_Fashion_Ecosystem\.png/);
    assert.match(sections, /DataSourcesVisual/);
    assert.match(sections, /BenchmarkPreview/);
    assert.match(sections, /ConsumerBridgeVisual/);
    for (const asset of [
      "INTERTEXE_01_Data_Architecture.png",
      "INTERTEXE_02_Product_Data_Journey.png",
      "INTERTEXE_03_Fashion_Ecosystem.png",
    ]) {
      assert.ok(
        fs.existsSync(path.join(process.cwd(), "public/platform", asset)),
        `missing editorial asset: ${asset}`,
      );
    }
  });
});
