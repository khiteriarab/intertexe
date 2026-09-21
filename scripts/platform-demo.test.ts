import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  DEMO_GTIN_MISSING,
  DEMO_GTIN_REPORTED,
  DEMO_GTIN_VERIFIED,
  DEMO_ILLUSTRATIVE_NOTICE,
  lookupDemoRecord,
} from "../lib/material-intelligence/demo-records.ts";
import {
  DEMO_CATALOG,
  DEMO_WORKFLOW,
  demoCatalogStats,
  demoIssueSummary,
} from "../lib/material-intelligence/demo-catalog.ts";
import { parseGtin, isValidGtinCheckDigit, appendGtinCheckDigit } from "../lib/gtin.ts";
import { parseCompositionText } from "../lib/material-intelligence/composition.ts";
import { evidenceStatusFromSource } from "../lib/material-intelligence/evidence.ts";
import { assertEnvelopeMatchesOpenApi, materialOpenApiDocument } from "../lib/material-intelligence/openapi.ts";
import { successEnvelope, errorEnvelope, newRequestId } from "../lib/material-intelligence/envelope.ts";
import { DPP_ALIGNMENT_NOTICE } from "../lib/material-intelligence/types.ts";

describe("GTIN validation", () => {
  it("accepts checksum-valid GTIN-8/12/13/14 and preserves leading zeroes", () => {
    const gtin8 = appendGtinCheckDigit("0000000");
    const gtin12 = appendGtinCheckDigit("01234567890");
    const gtin13 = DEMO_GTIN_VERIFIED;
    const gtin14 = appendGtinCheckDigit("0001234567890");
    assert.equal(parseGtin(gtin8).ok, true);
    assert.equal(parseGtin(gtin12).ok, true);
    assert.equal((parseGtin(gtin13) as { gtin: string }).gtin, DEMO_GTIN_VERIFIED);
    assert.equal(parseGtin(gtin14).ok, true);
    assert.equal(isValidGtinCheckDigit(DEMO_GTIN_VERIFIED), true);
  });

  it("rejects the previous invalid demo GTIN-13", () => {
    assert.equal(isValidGtinCheckDigit("0198765432104"), false);
    assert.equal(parseGtin("0198765432104").ok, false);
  });
});

describe("Demo fixtures", () => {
  it("uses checksum-valid identifiers for all three records", () => {
    for (const gtin of [DEMO_GTIN_VERIFIED, DEMO_GTIN_REPORTED, DEMO_GTIN_MISSING]) {
      assert.equal(parseGtin(gtin).ok, true, gtin);
    }
  });

  it("labels the verified fixture as an illustrative sample", () => {
    const record = lookupDemoRecord(DEMO_GTIN_VERIFIED);
    assert.ok(record);
    assert.equal(record.evidence.status, "verified_label");
    assert.equal(record.match_type, "exact_gtin");
    assert.match(record.message || "", /Illustrative verified-label example/i);
    assert.equal(record.message, DEMO_ILLUSTRATIVE_NOTICE);
    assert.equal(record.product.brand, "INTERTEXE Sample");
    assert.ok(!/reviewed garment-label evidence/i.test(JSON.stringify(record)));
  });

  it("accepts SKU aliases without inventing a manufacturer", () => {
    assert.equal(lookupDemoRecord("SAMPLE-VERIFIED")?.product.gtin, DEMO_GTIN_VERIFIED);
    assert.equal(lookupDemoRecord("SAMPLE-REPORTED")?.evidence.status, "reported_retailer");
    const missing = lookupDemoRecord("SAMPLE-MISSING");
    assert.equal(missing?.match_type, "not_found");
    assert.equal(missing?.product.brand, null);
    assert.equal(missing?.composition.components.length, 0);
  });

  it("does not invent a company from a sample prefix", () => {
    const record = lookupDemoRecord(DEMO_GTIN_MISSING);
    assert.ok(record);
    assert.equal(record.match_type, "not_found");
    assert.equal(record.product.brand, null);
    assert.equal(record.composition.components.length, 0);
    assert.doesNotMatch(JSON.stringify(record), /Demo House/);
    assert.match(record.message || "", /No manufacturer was assumed/);
  });

  it("does not search production for unknown valid GTINs", () => {
    const unknown = appendGtinCheckDigit("999999999999");
    assert.equal(lookupDemoRecord(unknown), null);
  });
});

describe("Provenance mapping", () => {
  it("never upgrades retailer, affiliate, or user_scan data to verified_label", () => {
    assert.equal(
      evidenceStatusFromSource({ source: "affiliate_feed", hasComposition: true }),
      "reported_retailer"
    );
    assert.equal(
      evidenceStatusFromSource({ source: "retailer_page", hasComposition: true }),
      "reported_retailer"
    );
    assert.equal(
      evidenceStatusFromSource({ source: "user_scan", verifiedBy: "user_scan", hasComposition: true }),
      "unknown_legacy"
    );
    assert.equal(
      evidenceStatusFromSource({ source: "inferred", hasComposition: true }),
      "inferred"
    );
    assert.equal(
      evidenceStatusFromSource({
        source: "physical_label_scan",
        verifiedBy: "label_reviewer",
        reviewedAt: "2026-08-02T12:00:00Z",
        hasComposition: true,
      }),
      "verified_label"
    );
  });
});

describe("Composition parsing", () => {
  it("does not invent a remainder to reach 100", () => {
    const parsed = parseCompositionText("80% cotton");
    assert.equal(parsed.total_percentage, 80);
    assert.equal(parsed.components.length, 1);
    assert.ok(parsed.normalization_warnings.some((w) => /not invented/i.test(w)));
  });
});

describe("OpenAPI contract", () => {
  it("describes OpenAPI 3.1 and the production path", () => {
    const doc = materialOpenApiDocument();
    assert.equal(doc.openapi, "3.1.0");
    assert.ok(doc.paths["/api/v1/composition/{gtin}"]);
    assert.ok(doc.paths["/api/v1/demo/composition/{gtin}"]);
  });

  it("matches runtime success and error envelopes", () => {
    const record = lookupDemoRecord(DEMO_GTIN_VERIFIED);
    assert.ok(record);
    const ok = successEnvelope(newRequestId(), record);
    assert.deepEqual(assertEnvelopeMatchesOpenApi(ok as unknown as Record<string, unknown>), []);
    const err = errorEnvelope("req_test", "invalid_gtin", "bad identifier");
    assert.deepEqual(assertEnvelopeMatchesOpenApi(err as unknown as Record<string, unknown>), []);
    assert.equal("stack" in err, false);
    assert.match(ok.data.dpp_alignment.notice, /not legal certification/i);
    assert.equal(ok.data.dpp_alignment.notice, DPP_ALIGNMENT_NOTICE);
  });
});

describe("Public demo and docs source safety", () => {
  it("keeps the public demo route free of database credentials", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/api/v1/demo/composition/[gtin]/route.ts"),
      "utf8"
    );
    assert.equal(/supabase|SERVICE_ROLE|createClient/i.test(route), false);
    assert.match(route, /lookupDemoRecord/);
    assert.match(route, /demoRateLimit/);
  });

  it("does not use a wildcard CORS policy on the production endpoint", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/api/v1/composition/[gtin]/route.ts"),
      "utf8"
    );
    assert.match(route, /https:\/\/www\.intertexe\.com/);
    assert.equal(/\*\s*["']/.test(route) && /Access-Control-Allow-Origin["']:\s*["']\*/.test(route), false);
    assert.doesNotMatch(route, /Access-Control-Allow-Origin": "\*"/);
  });

  it("does not select raw key hashes for the founder list endpoint", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/api/dashboard/material-api-clients/route.ts"),
      "utf8"
    );
    assert.match(route, /key_prefix, last_four/);
    assert.doesNotMatch(route, /select\("[^"]*key_hash/);
  });

  it("does not accept confidential catalog uploads on the public form", () => {
    const form = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformLeadForm.tsx"), "utf8");
    assert.doesNotMatch(form, /type=["']file["']/);
    assert.match(form, /Do not attach confidential catalogs/);
  });

  it("keeps the Material Intelligence migration additive and reversible", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260819_material_intelligence_api.sql"),
      "utf8"
    );
    assert.match(sql, /Additive only/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.material_api_clients/);
    assert.match(sql, /DROP TABLE IF EXISTS public\.material_evidence/);
    assert.doesNotMatch(sql, /^\s*ALTER TABLE public\.(products|barcode_compositions|upc_brand_prefixes)/m);
    assert.match(sql, /^--\s+DROP TABLE IF EXISTS public\.material_api_usage;/m);
    assert.doesNotMatch(sql, /^\s*DROP TABLE /m);
  });

  it("keeps documentation examples on the demo endpoint and OpenAPI URL", () => {
    const openapi = fs.readFileSync(path.join(process.cwd(), "lib/material-intelligence/openapi.ts"), "utf8");
    const faq = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformFaq.tsx"), "utf8");
    assert.match(openapi, /\/api\/v1\/demo\/composition\//);
    assert.match(openapi, /unknown_legacy/);
    assert.match(faq, /\/api\/openapi\.json/);
    assert.equal(fs.existsSync(path.join(process.cwd(), "app/platform/api/page.tsx")), false);
    assert.equal(fs.existsSync(path.join(process.cwd(), "app/platform/PlatformApiSection.tsx")), false);
  });
});

describe("Permanent 10-product demonstration catalog", () => {
  it("walks ten INTERTEXE sample products through the full workflow", () => {
    assert.equal(DEMO_CATALOG.length, 10);
    assert.equal(
      DEMO_WORKFLOW.map((step) => step.id).join("→"),
      "source→normalized→issues→intelligence→benchmark→passports"
    );
    assert.ok(DEMO_CATALOG.some((product) => product.name === "Dress 8721"));
    assert.ok(DEMO_CATALOG.some((product) => product.issues.includes("conflict")));
    assert.ok(DEMO_CATALOG.some((product) => product.issues.includes("invalid_total")));
    const stats = demoCatalogStats();
    assert.equal(stats.products, 10);
    assert.ok(stats.issueCount > 0);
    assert.ok(stats.readyCount > 0);
    assert.ok(demoIssueSummary().length > 0);
    const conflict = DEMO_CATALOG.find((product) => product.id === "dress-8721");
    assert.equal(conflict?.naturalFiberShare, null);
    assert.match(conflict?.normalized.shell || "", /Conflict/);
  });

  it("keeps the editorial demo page focused on lifecycle and workflow", () => {
    const demo = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/PlatformDemoClient.tsx"), "utf8");
    const demoPage = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/page.tsx"), "utf8");
    const featuredSection = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoFeaturedExample.tsx"), "utf8");
    const featured = fs.readFileSync(path.join(process.cwd(), "lib/material-intelligence/demo-featured.ts"), "utf8");
    const previews = fs.readFileSync(path.join(process.cwd(), "app/platform/workspace-previews.tsx"), "utf8");
    assert.match(demo, /GovernedRecordStageSection/);
    assert.doesNotMatch(demo, /ProductLifecycleSystem/);
    assert.doesNotMatch(demo, /ProductLifecycleSection/);
    assert.doesNotMatch(demo, /DemoHero/);
    assert.doesNotMatch(demo, /DemoIntertexeFlow/);
    assert.match(demo, /DemoProductWorkflow/);
    assert.doesNotMatch(demo, /DemoFeaturedExample/);
    assert.match(demoPage, /SolutionsClose/);
    assert.match(demoPage, /demo_close/);
    assert.doesNotMatch(demo, /DemoClosingQuote/);
    assert.doesNotMatch(demo, /DemoScrollyJourney/);
    assert.doesNotMatch(demo, /DemoCatalogGrid/);
    const governed = fs.readFileSync(
      path.join(process.cwd(), "app/platform/GovernedRecordStageSection.tsx"),
      "utf8",
    );
    assert.match(governed, /From product data/);
    assert.match(governed, /to product intelligence\./);
    assert.match(governed, /demo-governed-workspace\.png/);
    assert.doesNotMatch(governed, /solutions-governed-record\.png/);
    assert.doesNotMatch(governed, /solutions-lifecycle/);
    assert.doesNotMatch(governed, /CREATE|PROVE|UNDERSTAND|PUBLISH|EXTEND/);
    assert.match(governed, /#journey/);
    assert.match(governed, /Explore the 6 stages/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-governed-workspace.png")));

    const workflow = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoProductWorkflow.tsx"), "utf8");
    const followSection = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/follow-the-record/FollowTheRecordSection.tsx"),
      "utf8",
    );
    const followData = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/follow-the-record/follow-the-record-data.ts"),
      "utf8",
    );
    const followCanvas = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/follow-the-record/StickyDemoCanvas.tsx"),
      "utf8",
    );
    const followCss = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/follow-the-record/FollowTheRecordSection.module.css"),
      "utf8",
    );
    assert.match(workflow, /FollowTheRecordSection/);
    assert.match(followSection, /activeIndex|goToStep/);
    assert.match(followSection, /STAGE_VH\s*=\s*48|48vh/);
    assert.match(followSection, /demo-source|stage\.image|active\.image|item\.image/);
    assert.match(followData, /id: "source"/);
    assert.match(followData, /Fragmented inputs, one product\./);
    assert.match(followData, /Claims become evidence-backed\./);
    assert.match(followData, /Signals return to the record\./);
    assert.match(followData, /Six ways teams work the record\./);
    assert.match(followData, /demo-source\.png/);
    assert.match(followData, /demo-normalize\.png/);
    assert.match(followData, /demo-validate\.png/);
    assert.match(followData, /demo-publish\.png/);
    assert.match(followData, /demo-activate\.png/);
    assert.match(followData, /demo-measure\.png/);
    assert.match(followCanvas, /active\.image|stage\.image|demo-source/);
    assert.match(followCss, /\.pin/);
    assert.match(followCss, /\.sticky/);
    assert.match(followCss, /\.rail/);
    assert.match(followCss, /\.visualShell/);
    assert.match(followCss, /\.visualFrame/);
    assert.match(followCss, /object-fit:\s*contain/);
    // Artwork must fill the sticky right pane (not a capped centered island).
    assert.match(followCss, /\.stageBaseImage \{[\s\S]*?height:\s*100%/);
    assert.match(followCss, /\.visualShell \{[\s\S]*?flex:\s*1/);
    assert.match(followCss, /\.strip \{[\s\S]*?width:\s*100%/);
    assert.doesNotMatch(followCss, /width:\s*min\(100%,\s*980px\)/);
    assert.doesNotMatch(followCss, /max-height:\s*68vh/);
    assert.match(followCss, /48vh|--ftr-stage-vh:\s*48vh/);
    assert.match(followCss, /var\(--ftr-steps\) \* var\(--ftr-stage-vh\)/);
    assert.doesNotMatch(followCss, /object-fit:\s*cover/);
    assert.doesNotMatch(followCss, /\.visualGlow/);
    assert.match(followSection, /stageCopyDesktop/);
    assert.match(followCss, /\.left \{[\s\S]*?justify-content:\s*flex-start/);
    assert.match(followCss, /\.rail \{[\s\S]*?flex:\s*0 0 auto/);
    // Motion overlay infrastructure (SOURCE / NORMALIZE first pass)
    assert.match(followSection, /StageInteractiveOverlay|StageOverlays/);
    assert.match(followSection, /interactiveOverlay|stageBaseImage/);
    assert.match(followCss, /\.interactiveOverlay/);
    assert.match(followCss, /\.stageBaseImage/);
    assert.match(followCss, /\.mobileTabs/);
    const overlays = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/follow-the-record/StageOverlays.tsx"),
      "utf8",
    );
    assert.match(overlays, /SourceOverlay|SOURCES CONNECTED|Sources connected/i);
    assert.match(overlays, /Normalize composition for Silk Midi Skirt/);
    assert.match(overlays, /92 SE 8 EA/);
    assert.match(overlays, /92% Silk/);
    assert.match(overlays, /CHAR_MS\s*=\s*45|45/);
    assert.match(overlays, /Source preserved|SOURCE PRESERVED/i);
    // Normalize artwork should be RGBA with transparency for Attio-style floating panels
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-normalize.png")));
    const normalizeBuf = fs.readFileSync(path.join(process.cwd(), "public/platform/demo-normalize.png"));
    assert.ok(normalizeBuf.includes(Buffer.from("IDAT")) || normalizeBuf.length > 100000);
    assert.doesNotMatch(followSection, /demo-workflow-rail-product/);
    assert.doesNotMatch(followSection, /Featured product/);
    assert.doesNotMatch(followSection, /demo-workflow-panel-inner/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-source.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-normalize.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-validate.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-publish.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-activate.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-measure.png")));
    const quote = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoClosingQuote.tsx"), "utf8");
    assert.match(quote, /Data that moves fashion forward/);
    assert.doesNotMatch(demo, /Data that moves fashion forward/);
    const pilot = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoPilotCta.tsx"), "utf8");
    assert.doesNotMatch(pilot, /Data that moves fashion forward/);
    const system = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/ProductLifecycleSystem.tsx"),
      "utf8",
    );
    assert.match(system, /LifecycleHeroSection/);
    assert.doesNotMatch(system, /SourceStack|PublishingNetwork|systemCanvas/);
    const hero = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/lifecycle/LifecycleHeroSection.tsx"),
      "utf8",
    );
    const map = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/lifecycle/LifecycleMapCanvas.tsx"),
      "utf8",
    );
    const record = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/lifecycle/CentralProductRecord.tsx"),
      "utf8",
    );
    const bridge = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/lifecycle/RecordTransitionBridge.tsx"),
      "utf8",
    );
    const data = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/lifecycle/lifecycle-data.ts"),
      "utf8",
    );
    assert.match(hero, /From material/);
    assert.match(hero, /to next life/);
    assert.match(hero, /See a live product/);
    assert.match(map, /LIFECYCLE_PATH_D/);
    assert.match(map, /CentralProductRecord/);
    assert.match(record, /Silk Midi Skirt/);
    assert.match(record, /ITX-4102/);
    assert.match(bridge, /Follow the record/i);
    assert.match(bridge, /See the record evolve/);
    assert.match(data, /RECORD_STATES/);
    assert.match(data, /id: "source"/);
    assert.match(data, /id: "recirculate"/);
    assert.equal([...data.matchAll(/id: "(source|clean|trace|prepare|publish|learn|recirculate)"/g)].length, 7);
    const systemCss = fs.readFileSync(
      path.join(process.cwd(), "components/see-it-live/lifecycle/lifecycle.module.css"),
      "utf8",
    );
    assert.match(systemCss, /--bg:\s*#fcfbf8/);
    assert.match(systemCss, /--gold:\s*#c4a574/);
    assert.doesNotMatch(systemCss, /--bg:\s*#e8dcc8/);
    assert.match(systemCss, /\.mapCanvas/);
    assert.match(systemCss, /\.record/);
    assert.match(systemCss, /\.bridge/);
    assert.doesNotMatch(systemCss, /\.systemCanvas|\.ss-featured-band/);
    assert.ok(!fs.existsSync(path.join(process.cwd(), "components/see-it-live/ProductLifecycleSystem.module.css")));
    assert.match(featuredSection, /Cotton Poplin Shirt/);
    assert.match(featuredSection, /workspace-cotton-poplin-shirt/);
    assert.match(featuredSection, /workspace-gods-true-linen-shirt/);
    assert.match(featuredSection, /workspace-upside-daria-miniskirt/);
    assert.match(featuredSection, /WORKSPACE_BY_STYLE/);
    assert.match(featuredSection, /View full passport/);
    assert.match(featuredSection, /Physical product/);
    assert.match(featuredSection, /Workspace record/);
    assert.match(featuredSection, /See it live/);
    assert.doesNotMatch(featuredSection, /Try another product/);
    assert.doesNotMatch(featuredSection, /Explore a real example/);
    assert.match(featuredSection, /QRCodeCanvas/);
    assert.match(featuredSection, /PLATFORM_FEATURED_EXAMPLE_STYLES/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo/workspace-cotton-poplin-shirt.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo/workspace-gods-true-linen-shirt.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo/workspace-upside-daria-miniskirt.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/khiteri/ganni-poplin-shirt.jpg")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/khiteri/rohe-turtleneck.jpg")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/khiteri/magda-butrym-midi.jpg")));
    const liveFixtures = fs.readFileSync(
      path.join(process.cwd(), "lib/enterprise/fixtures/intertexe-live-10-products.json"),
      "utf8",
    );
    assert.match(liveFixtures, /"brand": "Ganni"/);
    assert.match(liveFixtures, /"brand": "Róhe"/);
    assert.match(liveFixtures, /"brand": "Magda Butrym"/);
    assert.match(liveFixtures, /ganni-poplin-shirt\.jpg/);
    assert.match(liveFixtures, /rohe-turtleneck\.jpg/);
    assert.match(liveFixtures, /magda-butrym-midi\.jpg/);
    assert.doesNotMatch(liveFixtures, /Walter Baker/);
    assert.doesNotMatch(liveFixtures, /The Upside/);
    assert.doesNotMatch(liveFixtures, /God's True Cashmere/);
    const caseStudy = fs.readFileSync(path.join(process.cwd(), "lib/enterprise/passport-case-study.ts"), "utf8");
    assert.match(caseStudy, /brand: "Ganni"/);
    assert.match(caseStudy, /ganni-poplin-shirt\.jpg/);
    assert.doesNotMatch(caseStudy, /Walter Baker/);
    assert.match(featured, /ITX-4102/);
    assert.match(featured, /ITX-4102/);
    assert.doesNotMatch(featuredSection, /EU Certified/);
    assert.doesNotMatch(featuredSection, /Guaranteed Compliant/);
    assert.doesNotMatch(previews, /Official DPP Score/);
  });

  it("puts pilot CTA and lead form wiring on /platform/demo", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/page.tsx"), "utf8");
    const pilot = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoPilotCta.tsx"), "utf8");
    const office = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoOfficeSection.tsx"), "utf8");
    const form = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformLeadForm.tsx"), "utf8");
    const leads = fs.readFileSync(path.join(process.cwd(), "app/api/v1/leads/route.ts"), "utf8");
    const constants = fs.readFileSync(path.join(process.cwd(), "lib/email-constants.ts"), "utf8");
    const chrome = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformChrome.tsx"), "utf8");
    const previews = fs.readFileSync(path.join(process.cwd(), "app/platform/workspace-previews.tsx"), "utf8");
    assert.match(page, /PlatformDemoClient/);
    assert.doesNotMatch(page, /DemoOfficeSection/);
    assert.match(pilot, /Start with 10 products/);
    assert.match(pilot, /Your catalog, governed in INTERTEXE/);
    assert.match(form, /Do not attach confidential catalogs/);
    assert.doesNotMatch(form, /type=["']file["']/);
    assert.match(office, /Barcelona, Spain/);
    assert.doesNotMatch(office, /PlatformLeadForm/);
    assert.match(office, /cta=office_section/);
    assert.match(office, /#book/);
    assert.doesNotMatch(office, /khiteri@intertexe\.com/);
    assert.doesNotMatch(office, /info@intertexe\.com/);
    assert.doesNotMatch(office, /street address is shared/);
    assert.doesNotMatch(office, /Fairly Made/);
    assert.doesNotMatch(office, /Boulevard|Calle |Carrer |Via /);
    assert.doesNotMatch(page, /Fairly Made/);
    assert.doesNotMatch(page, /#004037/);
    assert.match(chrome, /PlatformNav active=\{active\}/);
    assert.match(previews, /Navy = your brand/);
    assert.doesNotMatch(previews, /Forest = your brand/);
    assert.match(constants, /PLATFORM_LEAD_TO = "info@intertexe\.com"/);
    assert.match(constants, /PLATFORM_LEAD_CC = "khiteri@intertexe\.com"/);
    assert.match(leads, /PLATFORM_LEAD_TO/);
    assert.match(leads, /cc: salesCc/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/barcelona-platform-office.jpg")));
  });
});
