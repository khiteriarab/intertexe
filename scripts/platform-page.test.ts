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
  const homeSections = fs.readFileSync(path.join(process.cwd(), "app/platform/sales-home-sections.tsx"), "utf8");
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
    assert.match(homeSections, /PlatformBrandShowcaseHero/);
    const showcaseHero = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformBrandShowcaseHero.tsx"), "utf8");
    assert.match(showcaseHero, /See it live/i);
    assert.match(showcaseHero, /\/platform\/demo/);
    assert.ok(showcaseHero.indexOf("platform-showcase-hero-sub") < showcaseHero.indexOf("platform-showcase-hero-cta"));
    const showcaseCss = fs.readFileSync(path.join(process.cwd(), "app/platform/platform-tokens.css"), "utf8");
    assert.match(showcaseCss, /@media \(max-width: 767px\)/);
    assert.match(showcaseCss, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
    assert.match(nav, /hidden md:inline-flex/);
    assert.match(showcaseHero, /One product record\./);
    assert.match(showcaseHero, /Every stage after\./);
    assert.match(showcaseHero, /stat\.figure/);
    assert.match(showcaseHero, /stat\.qualifier/);
    const showcaseStats = fs.readFileSync(path.join(process.cwd(), "lib/enterprise/platform-brand-showcase.ts"), "utf8");
    assert.match(showcaseStats, /figure: "70%"/);
    assert.match(showcaseStats, /qualifier: "faster"/);
    assert.match(showcaseCss, /platform-showcase-stat::before/);
    assert.match(showcaseCss, /clamp\(3\.35rem/);
    assert.match(showcaseStats, /Resale activation/);
    const luxuryCss = fs.readFileSync(path.join(process.cwd(), "app/platform/platform-luxury.css"), "utf8");
    assert.match(luxuryCss, /\.platform-showcase-stat-value \{[\s\S]*?clamp\(4\.25rem, 9vw, 8rem\)/);
    assert.match(sections, /one governed product record/i);
    assert.doesNotMatch(sections, /EU certified/i);
    assert.doesNotMatch(sections, /EU approved/i);
    assert.doesNotMatch(sections, /Guaranteed Compliant/);
  });

  it("uses a focused home hierarchy without redundant lifecycle or pricing blocks", () => {
    assert.match(home, /SalesHeroSection/);
    assert.match(homeSections, /PlatformBrandShowcaseHero/);
    assert.match(home, /PlatformHowItWorksSection/);
    assert.doesNotMatch(home, /PlatformFabricCinema/);
    const saasCss = fs.readFileSync(path.join(process.cwd(), "app/platform/platform-saas.css"), "utf8");
    assert.match(saasCss, /--platform-bg: #faf9f6/);
    assert.match(chrome, /platform-saas\.css/);
    assert.match(chrome, /platform-luxury\.css/);
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
    assert.doesNotMatch(howItWorks, /platform-product-story-flow-line/);
    assert.doesNotMatch(howItWorks, /platform-product-story-bridge/);
    assert.doesNotMatch(howItWorks, /PlatformCapabilityNav/);
    assert.match(howItWorks, /From raw product data to intelligent action/);
    assert.doesNotMatch(howItWorks, /understand-ingest-laptop\.jpg/);
    assert.doesNotMatch(howItWorks, /platform-editorial-step-grid/);
    assert.doesNotMatch(home, /PlatformWorkflowDeepDive/);
    assert.doesNotMatch(home, /PlatformScrollShowcase/);
    assert.doesNotMatch(home, /SalesIntelligenceSection/);
    assert.match(home, /SalesDeliverySection/);
    assert.match(home, /sales-home-sections/);
    assert.doesNotMatch(home, /from \".\/sales-sections\"/);
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
    assert.match(demoHero, /demo-hero-scanner-v2\.png/);
    assert.match(demo, /See INTERTEXE live/i);
    const banner = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformCircularWardrobeBanner.tsx"), "utf8");
    assert.match(banner, /Request a demo/);
    assert.match(banner, /\/platform\/request/);
    assert.match(banner, /Ebook/);
    assert.match(banner, /platform-ebook/);
    assert.doesNotMatch(banner, /Build the record your product deserves/);
    const showcaseHero = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformBrandShowcaseHero.tsx"), "utf8");
    assert.match(showcaseHero, /flipMode="composition"/);
    assert.match(showcaseHero, /flipMode="brand"/);
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
    assert.match(sections, /Start with 10 products/);
    assert.match(homeSections, /PlatformBrandShowcaseHero/);
    assert.match(sections, /getEnterpriseLoginUrl/);
    assert.match(nav, /getEnterpriseLoginUrl/);
    assert.match(nav, /Request a demo/);
    assert.match(nav, /Sign in/);
    assert.match(nav, /Solutions/);
    assert.match(nav, /\/platform\/solutions/);
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
    assert.match(page, /dynamic = "force-static"/);
    const platformLoading = fs.readFileSync(path.join(process.cwd(), "app/platform/loading.tsx"), "utf8");
    const shopLoading = fs.readFileSync(path.join(process.cwd(), "app/shop/loading.tsx"), "utf8");
    assert.doesNotMatch(platformLoading, /aspect-\[3\/4\]/);
    assert.match(shopLoading, /aspect-\[3\/4\]/);
    assert.equal(fs.existsSync(path.join(process.cwd(), "app/loading.tsx")), false);
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

  it("uses sliding lifecycle screens with workspace screenshots only", () => {
    const processVisual = fs.readFileSync(path.join(process.cwd(), "app/platform/b2b-visuals/WhatItIsProcessVisual.tsx"), "utf8");
    const slideAssets = fs.readFileSync(
      path.join(process.cwd(), "app/platform/b2b-visuals/lifecycle-slide-assets.ts"),
      "utf8",
    );
    assert.match(processVisual, /platform-lifecycle-journey/);
    assert.match(processVisual, /DiscoverLink/);
    assert.match(processVisual, /LIFECYCLE_SLIDE_ASSETS/);
    assert.match(processVisual, /platform-lifecycle-journey-copy/);
    assert.match(processVisual, /platform-what-slides-tabs/);
    assert.match(processVisual, /role="tablist"/);
    assert.match(processVisual, /role="tab"/);
    assert.match(processVisual, /platform-lifecycle-graphic--screenshot/);
    assert.match(processVisual, /platform-lifecycle-graphic-shot/);
    assert.match(processVisual, /sizes="\(max-width: 767px\) 92vw, 860px"/);
    assert.match(processVisual, /platform-lifecycle-discover/);
    assert.doesNotMatch(processVisual, /platform-lifecycle-accordion/);
    assert.doesNotMatch(processVisual, /aria-expanded/);
    assert.doesNotMatch(processVisual, /platform-lifecycle-journey-lead/);
    assert.doesNotMatch(processVisual, /platform-lifecycle-journey-visual/);
    assert.doesNotMatch(processVisual, /platform-lifecycle-graphic-scene/);
    assert.doesNotMatch(processVisual, /platform-lifecycle-graphic-product/);
    assert.doesNotMatch(processVisual, /PLATFORM_SALES_DEMO/);
    assert.doesNotMatch(slideAssets, /productImage/);
    assert.doesNotMatch(slideAssets, /sceneImage/);
    assert.doesNotMatch(slideAssets, /hero-silk-dress/);
    assert.doesNotMatch(slideAssets, /\/fabrics\//);
    assert.match(slideAssets, /create:[\s\S]*softwareImage: "\/platform\/workspace-overview\.png"/);
    assert.match(slideAssets, /verify:[\s\S]*softwareImage: "\/platform\/workspace-issues-inbox\.png"/);
    assert.match(slideAssets, /comply:[\s\S]*softwareImage: "\/platform\/workspace-operations\.png"/);
    assert.match(slideAssets, /distribute:[\s\S]*softwareImage: "\/platform\/workspace-product-record\.png"/);
    assert.match(slideAssets, /extend:[\s\S]*softwareImage: "\/platform\/workspace-suppliers\.png"/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/workspace-overview.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/workspace-issues-inbox.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/workspace-operations.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/workspace-product-record.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/workspace-suppliers.png")));
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
    assert.match(homeSections, /DeliveryModesVisual/);
    const deliveryVisual = fs.readFileSync(path.join(process.cwd(), "app/platform/b2b-visuals/DeliveryModesVisual.tsx"), "utf8");
    const deliveryCss = fs.readFileSync(path.join(process.cwd(), "app/platform/b2b-visuals.css"), "utf8");
    assert.match(deliveryVisual, /platform-delivery-storyline/);
    assert.match(deliveryVisual, /platform-delivery-arch/);
    assert.match(deliveryVisual, /Hosted passport/);
    assert.match(deliveryVisual, /White label/);
    assert.match(deliveryVisual, /API/);
    assert.match(deliveryVisual, /QR · NFC · RFID · Web/);
    assert.match(deliveryVisual, /One governed record · three delivery modes · not mutually exclusive/);
    assert.match(deliveryVisual, /PASSPORT_CASE_STUDY/);
    assert.match(deliveryVisual, /Open the passport/);
    assert.doesNotMatch(deliveryVisual, /setOpenIndex/);
    assert.doesNotMatch(deliveryVisual, /story-product-identity\.png/);
    const identityPng = fs.readFileSync(path.join(process.cwd(), "public/platform/symbols/story-product-identity.png"));
    assert.equal(identityPng.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
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
    assert.match(pillarsVisual, /Learn more/);
    assert.match(pillarsVisual, /platform-product-pillar-mark/);
    assert.match(pillarsVisual, /symbols\/story-product-identity\.png/);
    assert.match(pillarsVisual, /symbols\/story-carrier-qr-nfc\.png/);
    assert.match(pillarsVisual, /symbols\/story-delivery-channels\.png/);
    assert.doesNotMatch(pillarsVisual, /platform-product-pillar-visual/);
    assert.match(pillarsVisual, /\/platform\/demo#journey/);
    assert.match(pillarsVisual, /\/platform#delivery/);
    assert.match(visuals, /Discover · Scan · Compare/);
    assert.match(workspaceExplorer, /lifecycleModuleCatalogByGroup/);
  });
});
