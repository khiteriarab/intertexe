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

  it("keeps the editorial demo page focused on one featured product", () => {
    const demo = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/PlatformDemoClient.tsx"), "utf8");
    const lifecycle = fs.readFileSync(
      path.join(process.cwd(), "app/platform/demo/ProductLifecycleSection.tsx"),
      "utf8",
    );
    const lifecycleData = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/lifecycle-data.ts"), "utf8");
    const featuredSection = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoFeaturedExample.tsx"), "utf8");
    const featured = fs.readFileSync(path.join(process.cwd(), "lib/material-intelligence/demo-featured.ts"), "utf8");
    const previews = fs.readFileSync(path.join(process.cwd(), "app/platform/workspace-previews.tsx"), "utf8");
    assert.match(demo, /ProductLifecycleSection/);
    assert.doesNotMatch(demo, /DemoHero/);
    assert.doesNotMatch(demo, /DemoIntertexeFlow/);
    assert.match(demo, /DemoProductWorkflow/);
    assert.match(demo, /DemoFeaturedExample/);
    assert.doesNotMatch(demo, /DemoClosingQuote/);
    assert.doesNotMatch(demo, /DemoScrollyJourney/);
    assert.doesNotMatch(demo, /DemoCatalogGrid/);
    const workflow = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoProductWorkflow.tsx"), "utf8");
    assert.match(workflow, /activeStep === "source"/);
    assert.match(workflow, /activeStep === "normalize"/);
    assert.match(workflow, /demo-source\.png/);
    assert.match(workflow, /demo-normalize\.png/);
    assert.match(workflow, /demo-validate\.png/);
    assert.match(workflow, /demo-publish\.png/);
    assert.match(workflow, /demo-activate\.png/);
    assert.match(workflow, /demo-measure\.png/);
    assert.doesNotMatch(workflow, /demo-workflow-rail-product/);
    assert.doesNotMatch(workflow, /Featured product/);
    assert.doesNotMatch(workflow, /IntersectionObserver/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-source.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-normalize.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-validate.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-publish.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-activate.png")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/demo-measure.png")));
    const quote = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoClosingQuote.tsx"), "utf8");
    assert.match(quote, /Data that moves fashion forward/);
    const client = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/PlatformDemoClient.tsx"), "utf8");
    assert.doesNotMatch(client, /Data that moves fashion forward/);
    const pilot = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/DemoPilotCta.tsx"), "utf8");
    assert.doesNotMatch(pilot, /Data that moves fashion forward/);
    assert.match(lifecycle, /From material to next life/);
    assert.match(lifecycle, /LifecycleMap/);
    assert.match(lifecycleData, /Source & Make/);
    assert.match(lifecycleData, /Repair & Recirculate/);
    assert.match(lifecycleData, /shortDescription/);
    assert.match(lifecycleData, /id: "source-make"/);
    assert.match(lifecycleData, /id: "repair-recirculate"/);
    assert.match(lifecycleData, /LIFECYCLE_CONNECTORS/);
    assert.equal([...lifecycleData.matchAll(/id: "[a-z-]+"/g)].length, 7);
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
