import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  DPP_READINESS_NOTICE,
  PREFIX_COMPOSITION_NOTICE,
  compositionIsAssumedVerified,
  lookupDemoComposition,
} from "../lib/platform-demo.ts";

describe("Material Intelligence demo records", () => {
  it("returns verified label evidence for the exact GTIN", () => {
    const record = lookupDemoComposition("0123456789012");
    assert.equal(record.product.match_type, "exact_gtin");
    assert.equal(record.product.name, "Silk Midi Skirt");
    assert.deepEqual(record.composition, [
      { fiber: "silk", percentage: 96 },
      { fiber: "elastane", percentage: 4 },
    ]);
    assert.equal(record.material_intelligence.natural_fiber_percentage, 96);
    assert.equal(record.provenance.status, "verified");
    assert.equal(record.provenance.source_type, "garment_label");
    assert.equal(record.provenance.reviewed, true);
    assert.equal(record.dpp_readiness.status, "partial");
    assert.ok(record.dpp_readiness.mapped_fields.includes("fiber_composition"));
    assert.ok(record.dpp_readiness.missing_fields.includes("country_of_origin"));
    assert.match(record.notice, /not legal certification/i);
    assert.equal(compositionIsAssumedVerified(record), true);
  });

  it("accepts SKU aliases for the verified and reported examples", () => {
    const bySku = lookupDemoComposition("SILK-MIDI-SKIRT");
    assert.equal(bySku.product.gtin, "0123456789012");
    assert.equal(bySku.product.match_type, "sku");
    assert.equal(lookupDemoComposition("COTTON-POPLIN-SHIRT").provenance.status, "reported");
  });

  it("labels retailer composition as reported, not verified", () => {
    const record = lookupDemoComposition("0198765432104");
    assert.equal(record.provenance.status, "reported");
    assert.equal(record.provenance.source_type, "retailer_feed");
    assert.equal(record.provenance.reviewed, false);
    assert.ok(record.composition.length > 0);
    assert.equal(compositionIsAssumedVerified(record), false);
  });

  it("identifies a manufacturer from a company prefix without guessing composition", () => {
    const record = lookupDemoComposition("0500123456789");
    assert.equal(record.product.match_type, "company_prefix");
    assert.equal(record.product.brand, "Demo House");
    assert.equal(record.product.name, null);
    assert.deepEqual(record.composition, []);
    assert.equal(record.material_intelligence.primary_fiber, null);
    assert.equal(record.provenance.status, "not_found");
    assert.equal(record.provenance.source_type, "company_prefix");
    assert.equal(record.provenance.reviewed, false);
    assert.equal(compositionIsAssumedVerified(record), false);
    assert.match(record.notice, /does not verify a specific product/i);
  });

  it("does not invent composition for an unknown identifier", () => {
    const record = lookupDemoComposition("9999999999999");
    assert.equal(record.product.match_type, "none");
    assert.deepEqual(record.composition, []);
    assert.equal(record.provenance.status, "not_found");
    assert.equal(compositionIsAssumedVerified(record), false);
  });

  it("keeps the public demo route free of database credentials", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/api/v1/demo/composition/[gtin]/route.ts"),
      "utf8"
    );
    assert.equal(/supabase|SERVICE_ROLE|createClient/i.test(route), false);
    assert.match(route, /lookupDemoComposition/);
    assert.match(route, /demoRateLimit/);
  });

  it("keeps certification language out of verified notices", () => {
    assert.match(DPP_READINESS_NOTICE, /not legal certification/i);
    assert.match(PREFIX_COMPOSITION_NOTICE, /company prefix/i);
  });
});
