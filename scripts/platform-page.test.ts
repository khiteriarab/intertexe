import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

describe("Platform B2B sales page", () => {
  const home = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformHome.tsx"), "utf8");
  const hero = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformHero.tsx"), "utf8");
  const sections = fs.readFileSync(path.join(process.cwd(), "app/platform/sales-sections.tsx"), "utf8");
  const stages = fs.readFileSync(path.join(process.cwd(), "app/platform/product-stages.tsx"), "utf8");
  const visuals = fs.readFileSync(path.join(process.cwd(), "app/platform/sales-visuals.tsx"), "utf8");
  const chrome = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformChrome.tsx"), "utf8");
  const nav = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformNav.tsx"), "utf8");
  const login = fs.readFileSync(path.join(process.cwd(), "app/platform/login/page.tsx"), "utf8");
  const page = fs.readFileSync(path.join(process.cwd(), "app/platform/page.tsx"), "utf8");
  const form = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformLeadForm.tsx"), "utf8");
  const faq = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformFaq.tsx"), "utf8");
  const discover = fs.readFileSync(path.join(process.cwd(), "app/platform/WorkspaceGallery.tsx"), "utf8");

  it("positions INTERTEXE as product intelligence infrastructure, not DPP-only software", () => {
    assert.match(sections, /product intelligence infrastructure for fashion/i);
    assert.match(hero, /INTERTEXE FOR BRANDS/);
    assert.match(sections, /one governed product record/i);
    assert.match(sections, /Outputs from one record/);
    assert.match(sections, /not the whole product/);
    assert.doesNotMatch(sections, /EU certified/i);
    assert.doesNotMatch(sections, /EU approved/i);
    assert.doesNotMatch(sections, /Guaranteed Compliant/);
  });

  it("uses the B2B sales hierarchy with lifecycle and delivery sections", () => {
    assert.match(home, /SalesHeroSection/);
    assert.match(home, /SalesWhatItIsSection/);
    assert.match(home, /SalesLifecycleSection/);
    assert.match(home, /SalesDeliverySection/);
    assert.match(home, /SalesGovernedRecordSection/);
    assert.match(home, /SalesIntelligenceSection/);
    assert.match(home, /SalesOutputsSection/);
    assert.match(home, /SalesPublishSection/);
    assert.match(home, /SalesPlatformBreadthSection/);
    assert.match(home, /SalesCtaSection/);
    assert.doesNotMatch(home, /SalesProblemSection/);
    assert.doesNotMatch(home, /SalesHowItWorksSection/);
    assert.doesNotMatch(home, /SalesDppSection/);
    assert.match(home, /PricingPlans/);
    assert.doesNotMatch(home, /StoryTabs/);
    assert.doesNotMatch(home, /ComparisonView/);
  });

  it("converts with Request a demo and Sign in to enterprise login", () => {
    assert.match(hero, /href="\/platform\/request\?intent=snapshot&cta=hero"/);
    assert.match(hero, /Request a demo/);
    assert.match(sections, /getEnterpriseLoginUrl/);
    assert.match(nav, /getEnterpriseLoginUrl/);
    assert.match(nav, /Request a demo/);
    assert.match(nav, /Sign in/);
    assert.match(chrome, /getEnterpriseLoginUrl/);
    assert.match(login, /getEnterpriseLoginUrl/);
    assert.match(form, /Free 10-product Material Snapshot/);
  });

  it("centers intelligence and delivery without overclaiming", () => {
    assert.match(sections, /Benchmark your material strategy against the market/);
    assert.match(sections, /Material Benchmark/);
    assert.match(sections, /Conversion signals/);
    assert.match(sections, /IntelligenceBenchmarkVisual/);
    assert.match(sections, /Headless API/);
    assert.match(sections, /thirty seconds/i);
    assert.match(sections, /silk evening dress/i);
    assert.match(sections, /SaaSDemoFlowVisual/);
    assert.match(sections, /aggregate only, never individual shopper data/);
    assert.match(sections, /not yet operational/);
    assert.match(sections, /Illustrative example/);
    assert.match(sections, /not fabricated competitor dumps/);
    assert.match(visuals, /Material Benchmark/);
    assert.match(visuals, /Conversion by material cohort/);
    assert.match(visuals, /Understand/);
    assert.match(visuals, /Publish/);
    assert.doesNotMatch(sections, /150 companies trust us/i);
    assert.doesNotMatch(sections, /being built/i);
  });

  it("uses infrastructure-first page metadata", () => {
    assert.match(page, /Product Intelligence Infrastructure for Fashion/);
    assert.match(page, /digital experience your customer sees/i);
    assert.match(page, /headless API/i);
  });

  it("keeps FAQ and detailed comparison off the home page", () => {
    assert.match(faq, /product intelligence infrastructure/i);
    assert.match(faq, /does not fabricate product data/i);
    assert.match(faq, /Headless API/);
    assert.doesNotMatch(home, /PlatformFaq/);
    assert.doesNotMatch(home, /ComparisonView/);
    assert.match(page, /PlatformHome/);
  });

  it("uses native sales visuals instead of editorial PNG decks", () => {
    assert.match(hero, /hero-workspace-desktop\.png/);
    assert.match(hero, /hero-silk-dress\.png/);
    assert.match(stages, /hero-silk-dress\.png/);
    assert.doesNotMatch(sections, /ProblemConvergenceVisual/);
    assert.doesNotMatch(sections, /GovernedRecordVisual/);
    assert.match(sections, /Connected product identity/i);
    assert.match(sections, /From product record to physical product/);
    assert.match(sections, /ProductIdentityCarriersVisual/);
    assert.match(sections, /Managed product identity and passport infrastructure/);
    assert.match(sections, /compatible connected carriers/i);
    assert.doesNotMatch(sections, /PassportIdentityVisual/);
    assert.doesNotMatch(sections, /manufactures NFC/i);
    assert.doesNotMatch(sections, /Supabase hosting/i);
    assert.match(sections, /DeliveryModesVisual/);
    assert.match(sections, /SaaSDemoFlowVisual/);
    assert.match(sections, /PublishExperienceVisual/);
    assert.match(sections, /PlatformModuleGrid/);
    assert.doesNotMatch(sections, /PlatformEditorialGraphic/);
    assert.doesNotMatch(sections, /INTERTEXE_01_Data_Architecture/);
    assert.doesNotMatch(sections, /WorkspaceChrome/);
    assert.doesNotMatch(sections, /WorkspaceHeroPreview/);
    assert.doesNotMatch(sections, /DataSourcesVisual/);
    assert.doesNotMatch(sections, /ConsumerBridgeVisual/);
    assert.doesNotMatch(sections, /DppFlow/);
    assert.match(visuals, /Discover · Scan · Compare/);
    assert.match(visuals, /enterpriseModuleCatalogByGroup/);
    assert.match(visuals, /marketingMaturityFootnote/);
    assert.doesNotMatch(sections, /leaves/i);
    assert.doesNotMatch(sections, /factory/i);
  });

  it("explains delivery modes on Discover", () => {
    assert.match(discover, /Consumer delivery/);
    assert.match(discover, /Headless API/);
    assert.match(discover, /White Label/);
    assert.match(discover, /INTERTEXE Hosted/);
  });
});
