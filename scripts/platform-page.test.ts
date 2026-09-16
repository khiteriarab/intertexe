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
  const requestPage = fs.readFileSync(path.join(process.cwd(), "app/platform/request/page.tsx"), "utf8");
  const demoClient = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/PlatformDemoClient.tsx"), "utf8");

  it("positions INTERTEXE as product intelligence infrastructure, not DPP-only software", () => {
    assert.match(chrome, /product intelligence infrastructure for/i);
    assert.match(sections, /PlatformBrandShowcaseHero/);
    const showcaseHero = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformBrandShowcaseHero.tsx"), "utf8");
    assert.match(showcaseHero, /See it live/i);
    assert.match(showcaseHero, /\/platform\/demo/);
    assert.match(showcaseHero, /One product record\. From conception to next life\./);
    assert.match(showcaseHero, /stat\.figure/);
    assert.match(showcaseHero, /stat\.qualifier/);
    const showcaseStats = fs.readFileSync(path.join(process.cwd(), "lib/enterprise/platform-brand-showcase.ts"), "utf8");
    assert.match(showcaseStats, /figure: "70%"/);
    assert.match(showcaseStats, /qualifier: "faster"/);
    const showcaseCss = fs.readFileSync(path.join(process.cwd(), "app/platform/platform-tokens.css"), "utf8");
    assert.match(showcaseCss, /platform-showcase-stat::before/);
    assert.match(showcaseCss, /clamp\(3\.35rem/);
    assert.match(showcaseStats, /Resale activation/);
    assert.match(sections, /one governed product record/i);
    assert.doesNotMatch(sections, /EU certified/i);
    assert.doesNotMatch(sections, /EU approved/i);
    assert.doesNotMatch(sections, /Guaranteed Compliant/);
  });

  it("uses a focused home hierarchy without redundant lifecycle or pricing blocks", () => {
    assert.match(home, /SalesHeroSection/);
    assert.match(sections, /PlatformBrandShowcaseHero/);
    assert.match(home, /PlatformHowItWorksSection/);
    assert.match(home, /PlatformFabricCinema/);
    assert.match(howItWorks, /platform-band--white/);
    assert.match(howItWorks, /platform-band--dark/);
    const saasCss = fs.readFileSync(path.join(process.cwd(), "app/platform/platform-saas.css"), "utf8");
    assert.match(saasCss, /--platform-bg: #ffffff/);
    assert.match(saasCss, /platform-band--dark/);
    assert.match(chrome, /platform-saas\.css/);
    assert.match(howItWorks, /WhatItIsProcessVisual/);
    const processVisual = fs.readFileSync(
      path.join(process.cwd(), "app/platform/b2b-visuals/WhatItIsProcessVisual.tsx"),
      "utf8",
    );
    assert.match(processVisual, /Create/);
    assert.match(processVisual, /Verify/);
    assert.match(processVisual, /Comply/);
    assert.match(processVisual, /Distribute/);
    assert.match(processVisual, /Extend/);
    assert.match(processVisual, /Discover/);
    assert.match(processVisual, /platform-lifecycle-journey/);
    assert.match(processVisual, /Input/);
    assert.match(processVisual, /Validation/);
    assert.match(processVisual, /Compliance/);
    assert.match(processVisual, /Delivery/);
    assert.match(processVisual, /Circularity/);
    assert.doesNotMatch(howItWorks, /PlatformIntelligenceLayer/);
    assert.match(howItWorks, /Analyze/);
    assert.match(howItWorks, /Benchmark/);
    assert.match(howItWorks, /Forecast/);
    assert.match(howItWorks, /Recommend/);
    assert.match(howItWorks, /Act/);
    assert.match(howItWorks, /Sign in to open intelligence/);
    assert.match(howItWorks, /From raw product data to intelligent action/);
    assert.doesNotMatch(howItWorks, /understand-ingest-laptop\.jpg/);
    assert.doesNotMatch(howItWorks, /platform-editorial-step-grid/);
    assert.doesNotMatch(home, /PlatformWorkflowDeepDive/);
    assert.doesNotMatch(home, /PlatformScrollShowcase/);
    assert.doesNotMatch(home, /SalesIntelligenceSection/);
    assert.match(home, /SalesDeliverySection/);
    assert.doesNotMatch(home, /SalesPlatformBreadthSection/);
    assert.match(howItWorks, /PlatformProductPillarsVisual/);
    assert.match(howItWorks, /WhatItIsProcessVisual/);
    assert.match(howItWorks, /Three layers\. One governed source of truth\./);
    assert.doesNotMatch(home, /PlatformProofSection/);
    assert.match(home, /PlatformFaq/);
    assert.doesNotMatch(home, /SalesStartFreeSection/);
    assert.match(home, /PlatformCircularWardrobeBanner/);
    assert.match(requestPage, /platform-request-page/);
    assert.match(requestPage, /platform-request-copy/);
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
    assert.doesNotMatch(demoClient, /DemoIntertexeFlow/);
    assert.match(demoClient, /DemoProductWorkflow/);
    assert.match(demoClient, /DemoFeaturedExample/);
    assert.doesNotMatch(demoClient, /DemoClosingQuote/);
    assert.doesNotMatch(demoClient, /DemoBookSection/);
    const demoHero = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoHero.tsx"), "utf8");
    assert.match(demoHero, /demo-see-it-live\.jpg/);
    assert.match(demo, /See INTERTEXE live/i);
    const banner = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformCircularWardrobeBanner.tsx"), "utf8");
    assert.match(banner, /Request a demo/);
    assert.match(banner, /\/platform\/request/);
    assert.match(gallery, /WorkspaceGallery/);
    assert.match(gallery, /headless API/i);
    assert.ok(!fs.existsSync(path.join(process.cwd(), "app/platform/discover/page.tsx")));
    assert.ok(!fs.existsSync(path.join(process.cwd(), "app/platform/ebook/page.tsx")));
    assert.doesNotMatch(chrome, /\/platform\/ebook/);
    assert.doesNotMatch(faq, /\/platform\/ebook/);
  });

  it("converts with 10-product pilot, live flow, and enterprise login", () => {
    assert.match(hero, /Discover/);
    assert.match(hero, /Create/);
    assert.match(hero, /Verify/);
    assert.match(hero, /Comply/);
    assert.match(hero, /Distribute/);
    assert.match(hero, /Extend/);
    assert.doesNotMatch(hero, /Start with 10 products/);
    assert.match(howItWorks, /Discover/);
    assert.match(howItWorks, /WhatItIsProcessVisual/);
    assert.doesNotMatch(howItWorks, /Start with 10 products/);
    assert.match(sections, /Start with 10 products|PlatformBrandShowcaseHero/);
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
    const entIntelligence = fs.readFileSync(
      path.join(process.cwd(), "app/dashboard/components/EntIntelligenceWorkspace.tsx"),
      "utf8",
    );
    const entIntelligenceModules = fs.readFileSync(
      path.join(process.cwd(), "app/dashboard/components/EntIntelligenceModules.tsx"),
      "utf8",
    );
    assert.doesNotMatch(howItWorks, /PlatformIntelligenceLayer/);
    assert.match(howItWorks, /Material intelligence/);
    assert.match(entIntelligence, /EntMaterialBenchmarkModule/);
    assert.match(entIntelligenceModules, /Material Benchmark/);
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

  it("uses sliding lifecycle screens with product and workspace graphics", () => {
    const processVisual = fs.readFileSync(path.join(process.cwd(), "app/platform/b2b-visuals/WhatItIsProcessVisual.tsx"), "utf8");
    const slideAssets = fs.readFileSync(
      path.join(process.cwd(), "app/platform/b2b-visuals/lifecycle-slide-assets.ts"),
      "utf8",
    );
    assert.match(processVisual, /platform-lifecycle-journey/);
    assert.match(processVisual, /DiscoverLink/);
    assert.match(processVisual, /LIFECYCLE_SLIDE_ASSETS/);
    assert.match(slideAssets, /productImage: "\/platform\/hero-silk-dress\.png"/);
    assert.match(slideAssets, /softwareImage: "\/platform\/understand-ingest-laptop\.jpg"/);
    assert.match(slideAssets, /softwareImage: "\/platform\/understand-issues\.png"/);
    assert.match(slideAssets, /softwareImage: "\/platform\/hero-workspace-desktop\.png"/);
    assert.match(slideAssets, /softwareImage: "\/platform\/act-passport\.png"/);
    assert.match(slideAssets, /softwareImage: "\/platform\/hero-lifecycle-experience\.jpg"/);
    assert.match(processVisual, /PLATFORM_SALES_DEMO/);
    assert.doesNotMatch(processVisual, /PASSPORT_CASE_STUDY/);
    assert.match(processVisual, /Create/);
    assert.match(processVisual, /Verify/);
    assert.match(processVisual, /Comply/);
    assert.match(processVisual, /Distribute/);
    assert.match(processVisual, /Extend/);
    assert.doesNotMatch(processVisual, /understand-ingest-laptop/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/understand-ingest-laptop.jpg")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/hero-workspace-desktop.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/hero-silk-dress.png")));
  });

  it("uses native sales visuals instead of editorial PNG decks", () => {
    assert.match(hero, /PlatformHeroLifecycleVisual/);
    assert.match(heroVisual, /hero-lifecycle-composite\.png/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/hero-lifecycle-composite.png")));
    assert.doesNotMatch(sections, /ProblemConvergenceVisual/);
    assert.doesNotMatch(sections, /GovernedRecordVisual/);
    assert.match(sections, /DeliveryModesVisual/);
    const deliveryVisual = fs.readFileSync(path.join(process.cwd(), "app/platform/b2b-visuals/DeliveryModesVisual.tsx"), "utf8");
    assert.match(deliveryVisual, /platform-delivery-storyline/);
    assert.match(deliveryVisual, /One governed record · three delivery modes · not mutually exclusive/);
    assert.match(deliveryVisual, /story-product-identity\.png/);
    assert.match(deliveryVisual, /story-publish-approved\.png/);
    assert.match(deliveryVisual, /story-delivery-channels\.png/);
    assert.match(deliveryVisual, /story-carrier-qr-nfc\.png/);
    assert.match(deliveryVisual, /story-consumer-scan\.png/);
    const identityPng = fs.readFileSync(path.join(process.cwd(), "public/platform/symbols/story-product-identity.png"));
    assert.equal(identityPng.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    const deliveryCss = fs.readFileSync(path.join(process.cwd(), "app/platform/b2b-visuals.css"), "utf8");
    assert.match(deliveryCss, /\.platform-delivery-story-visual--symbol \{[\s\S]*?background: transparent;/);
    assert.match(deliveryCss, /width: 16rem/);
    assert.match(deliveryCss, /\.platform-delivery-storyline-label \{[\s\S]*?clamp\(1\.55rem/);
    assert.doesNotMatch(deliveryCss, /radial-gradient\(circle at 50% 42%, #1a1816/);
    assert.match(howItWorks, /PlatformProductPillarsVisual/);
    assert.match(visuals, /PlatformProductPillarsVisual/);
    assert.match(visuals, /PlatformWorkspaceExplorer/);
    assert.doesNotMatch(sections, /PlatformEditorialGraphic/);
    assert.doesNotMatch(sections, /INTERTEXE_01_Data_Architecture/);
    assert.match(sections, /One record\. An entire product lifecycle\./);
    assert.match(sections, /INTERTEXE connects product creation, compliance, consumer transparency, and resale/);
    const pillarsVisual = fs.readFileSync(
      path.join(process.cwd(), "app/platform/b2b-visuals/PlatformProductPillarsVisual.tsx"),
      "utf8",
    );
    assert.match(pillarsVisual, /platform-product-pillars-grid/);
    assert.match(pillarsVisual, /Product intelligence/);
    assert.match(pillarsVisual, /Traceability \+ compliance/);
    assert.match(pillarsVisual, /Connected product lifecycle/);
    assert.match(pillarsVisual, /Explore product intelligence/);
    assert.match(pillarsVisual, /Explore traceability/);
    assert.match(pillarsVisual, /Explore the lifecycle/);
    assert.match(visuals, /Discover · Scan · Compare/);
    assert.match(workspaceExplorer, /lifecycleModuleCatalogByGroup/);
  });
});
