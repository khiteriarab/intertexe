import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

describe("Platform B2B sales page", () => {
  const home = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformHome.tsx"), "utf8");
  const hero = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformHero.tsx"), "utf8");
  const heroVisual = fs.readFileSync(
    path.join(process.cwd(), "app/platform/PlatformHeroLifecycleVisual.tsx"),
    "utf8",
  );
  const sections = fs.readFileSync(path.join(process.cwd(), "app/platform/sales-sections.tsx"), "utf8");
  const stages = fs.readFileSync(path.join(process.cwd(), "app/platform/product-stages.tsx"), "utf8");
  const visuals = fs.readFileSync(path.join(process.cwd(), "app/platform/sales-visuals.tsx"), "utf8");
  const workspaceExplorer = fs.readFileSync(
    path.join(process.cwd(), "app/platform/b2b-visuals/PlatformWorkspaceExplorer.tsx"),
    "utf8",
  );
  const chrome = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformChrome.tsx"), "utf8");
  const nav = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformNav.tsx"), "utf8");
  const login = fs.readFileSync(path.join(process.cwd(), "app/platform/login/page.tsx"), "utf8");
  const page = fs.readFileSync(path.join(process.cwd(), "app/platform/page.tsx"), "utf8");
  const form = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformLeadForm.tsx"), "utf8");
  const faq = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformFaq.tsx"), "utf8");
  const howItWorks = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformHowItWorksSection.tsx"), "utf8");
  const gallery = fs.readFileSync(path.join(process.cwd(), "app/platform/WorkspaceGallery.tsx"), "utf8");
  const demo = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/page.tsx"), "utf8");
  const demoClient = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/PlatformDemoClient.tsx"), "utf8");

  it("positions INTERTEXE as product intelligence infrastructure, not DPP-only software", () => {
    assert.match(sections, /product intelligence infrastructure for/i);
    assert.match(hero, /INTERTEXE FOR BRANDS/);
    assert.match(sections, /one governed product record/i);
    assert.doesNotMatch(sections, /EU certified/i);
    assert.doesNotMatch(sections, /EU approved/i);
    assert.doesNotMatch(sections, /Guaranteed Compliant/);
  });

  it("uses a focused home hierarchy without redundant lifecycle or pricing blocks", () => {
    assert.match(home, /SalesHeroSection/);
    assert.match(home, /PlatformHowItWorksSection/);
    assert.match(howItWorks, /WhatItIsProcessVisual/);
    assert.match(howItWorks, /Govern/);
    assert.match(howItWorks, /Publish/);
    assert.match(howItWorks, /Deliver/);
    assert.doesNotMatch(howItWorks, /understand-ingest-laptop\.jpg/);
    assert.doesNotMatch(howItWorks, /platform-editorial-step-grid/);
    assert.doesNotMatch(home, /PlatformWorkflowDeepDive/);
    assert.doesNotMatch(home, /PlatformScrollShowcase/);
    assert.match(home, /SalesIntelligenceSection/);
    assert.match(home, /SalesDeliverySection/);
    assert.match(home, /SalesPlatformBreadthSection/);
    assert.doesNotMatch(home, /PlatformProofSection/);
    assert.match(home, /PlatformFaq/);
    assert.match(home, /SalesStartFreeSection/);
    assert.doesNotMatch(home, /SalesWhatItIsSection/);
    assert.doesNotMatch(home, /SalesGovernedRecordSection/);
    assert.doesNotMatch(home, /SalesLifecycleSection/);
    assert.doesNotMatch(home, /SalesOutputsSection/);
    assert.doesNotMatch(home, /SalesPublishSection/);
    assert.doesNotMatch(home, /PricingPlans/);
    assert.doesNotMatch(home, /StoryTabs/);
    assert.doesNotMatch(home, /ComparisonView/);
  });

  it("routes live QR flow and API detail to dedicated pages", () => {
    assert.match(demo, /PlatformDemoClient/);
    assert.match(demoClient, /DemoHero/);
    assert.match(demoClient, /DemoIntertexeFlow/);
    assert.match(demoClient, /DemoProductWorkflow/);
    assert.match(demoClient, /DemoFeaturedExample/);
    const demoHero = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoHero.tsx"), "utf8");
    assert.match(demoHero, /demo-see-it-live\.jpg/);
    assert.match(demo, /See INTERTEXE live/i);
    assert.match(gallery, /WorkspaceGallery/);
    assert.match(gallery, /headless API/i);
    assert.ok(!fs.existsSync(path.join(process.cwd(), "app/platform/discover/page.tsx")));
    assert.ok(!fs.existsSync(path.join(process.cwd(), "app/platform/ebook/page.tsx")));
    assert.doesNotMatch(chrome, /\/platform\/ebook/);
    assert.doesNotMatch(faq, /\/platform\/ebook/);
  });

  it("converts with 10-product pilot, live flow, and enterprise login", () => {
    assert.match(hero, /Start with 10 products/);
    assert.match(hero, /See it live/);
    assert.match(sections, /Start with 10 products/);
    assert.match(sections, /getEnterpriseLoginUrl/);
    assert.match(nav, /getEnterpriseLoginUrl/);
    assert.match(nav, /Start with 10 products/);
    assert.match(nav, /Sign in/);
    assert.match(nav, /How it works/);
    assert.doesNotMatch(nav, /\/platform\/discover/);
    assert.match(chrome, /getEnterpriseLoginUrl/);
    assert.match(login, /getEnterpriseLoginUrl/);
    assert.match(form, /Start with 10 products \(pilot workspace\)/);
    assert.doesNotMatch(form, /\$5,000/);
    assert.match(demo, /See INTERTEXE live|guided tour/i);
    assert.doesNotMatch(demo, /Live demonstration/);
    assert.doesNotMatch(demo, /PlatformPageHeader/);
  });

  it("uses professional SaaS language on the public platform page", () => {
    assert.match(sections, /See INTERTEXE with your own products/i);
    assert.match(sections, /pricing is shared during onboarding/i);
    assert.doesNotMatch(home, /beside your desk/i);
    assert.doesNotMatch(home, /beside your laptop/i);
    assert.doesNotMatch(home, /thirty seconds/i);
    assert.doesNotMatch(hero, /Scan QR in 30 seconds/i);
  });

  it("centers intelligence and delivery without overclaiming", () => {
    const intelligence = fs.readFileSync(path.join(process.cwd(), "app/platform/intelligence/PlatformIntelligenceSection.tsx"), "utf8");
    assert.match(intelligence, /Know what to make next/);
    const intelligenceModules = fs.readFileSync(path.join(process.cwd(), "app/platform/intelligence/PlatformIntelligenceModules.tsx"), "utf8");
    assert.match(intelligence, /MaterialBenchmarkModule/);
    assert.match(intelligenceModules, /Material Benchmark/);
    assert.match(sections, /PlatformIntelligenceSection/);
    assert.match(sections, /PlatformIntelligenceSection/);
    assert.match(sections, /PlatformIntelligenceSection/);
    assert.match(sections, /PlatformIntelligenceSection/);
    assert.match(sections, /Headless API/);
    assert.match(sections, /SaaSDemoFlowVisual/);
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

  it("keeps detailed comparison off the home page but includes FAQ", () => {
    assert.match(faq, /more transparent industry/i);
    assert.match(faq, /does not fabricate product data/i);
    assert.match(faq, /headless API/i);
    assert.match(home, /PlatformFaq/);
    assert.doesNotMatch(home, /ComparisonView/);
    assert.match(page, /PlatformHome/);
  });

  it("uses P0 designed screenshots for benchmark, issues, and passport", () => {
    const graphics = fs.readFileSync(path.join(process.cwd(), "lib/platform-graphics.ts"), "utf8");
    const scroll = fs.readFileSync(path.join(process.cwd(), "app/platform/platform-scroll-stages.ts"), "utf8");
    assert.match(graphics, /compareBenchmark:[\s\S]*ready: true/);
    assert.match(graphics, /understandIssues:[\s\S]*ready: true/);
    assert.match(graphics, /actPassport:[\s\S]*ready: true/);
    assert.match(scroll, /compare-benchmark\.png/);
    assert.match(scroll, /understand-issues\.png/);
    assert.match(scroll, /act-passport\.png/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/compare-benchmark.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/understand-issues.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/act-passport.png")));
  });

  it("uses real QR codes in govern publish deliver process visual", () => {
    const processVisual = fs.readFileSync(path.join(process.cwd(), "app/platform/b2b-visuals/WhatItIsProcessVisual.tsx"), "utf8");
    assert.match(processVisual, /QRCodeCanvas/);
    assert.match(processVisual, /PASSPORT_CASE_STUDY/);
    assert.match(processVisual, /Govern/);
    assert.match(processVisual, /Publish/);
    assert.match(processVisual, /Deliver/);
    assert.doesNotMatch(processVisual, /understand-ingest-laptop/);
  });

  it("uses native sales visuals instead of editorial PNG decks", () => {
    assert.match(hero, /PlatformHeroLifecycleVisual/);
    assert.match(heroVisual, /hero-lifecycle-composite\.png/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/hero-lifecycle-composite.png")));
    assert.doesNotMatch(sections, /ProblemConvergenceVisual/);
    assert.doesNotMatch(sections, /GovernedRecordVisual/);
    assert.match(sections, /DeliveryModesVisual/);
    assert.match(sections, /PlatformModuleGrid/);
    assert.match(visuals, /PlatformWorkspaceExplorer/);
    assert.doesNotMatch(sections, /PlatformEditorialGraphic/);
    assert.doesNotMatch(sections, /INTERTEXE_01_Data_Architecture/);
    assert.match(sections, /One workspace for the entire product lifecycle/);
    assert.match(sections, /From first material decisions and manufacturing evidence/);
    assert.match(visuals, /Discover · Scan · Compare/);
    assert.match(workspaceExplorer, /lifecycleModuleCatalogByGroup/);
  });
});
