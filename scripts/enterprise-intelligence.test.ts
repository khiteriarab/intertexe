import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { mappingForPreview } from "../lib/enterprise/import-preview.ts";
import { assertNotGlobalPromotion } from "../lib/enterprise/learning-loop.ts";
import {
  remapSavedMapping,
  schemaFingerprint,
} from "../lib/enterprise/mapping-templates.ts";
import {
  ITX_ONTOLOGY_VERSION,
  getMaterialTerm,
  resolveMaterialToken,
} from "../lib/enterprise/ontology.ts";
import { parseCompositionText } from "../lib/material-intelligence/composition.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Material ontology v1", () => {
  it("maps PA EA PES and keeps nylon in the polyamide family", () => {
    assert.equal(ITX_ONTOLOGY_VERSION, "itx-ontology.v1");
    assert.equal(resolveMaterialToken("PA")?.code, "polyamide");
    assert.equal(resolveMaterialToken("EA")?.code, "elastane");
    assert.equal(resolveMaterialToken("PES")?.code, "polyester");
    assert.equal(resolveMaterialToken("spandex")?.code, "elastane");
    assert.equal(resolveMaterialToken("flax")?.code, "linen");
    const nylon = resolveMaterialToken("Nylon");
    assert.equal(nylon?.code, "nylon");
    assert.equal(nylon?.family, "polyamide");
    assert.equal(nylon?.parentCode, "polyamide");
    assert.equal(getMaterialTerm("polyamide")?.originClass, "synthetic");
    assert.equal(getMaterialTerm("cotton")?.originClass, "natural");
    assert.equal(getMaterialTerm("lyocell")?.originClass, "regenerated");
  });

  it("does not import the consumer shop merchandising taxonomy", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/ontology.ts"), "utf8");
    assert.doesNotMatch(src, /from ["'].*catalog-material-taxonomy/);
  });
});

describe("Deterministic composition normalization", () => {
  it("parses abbreviations without an LLM", () => {
    const pa = parseCompositionText("100% PA");
    assert.equal(pa.components[0]?.fiber_code, "polyamide");
    assert.equal(pa.components[0]?.fiber_name, "Polyamide");
    const blend = parseCompositionText("95% Cotton / 5% EA");
    assert.equal(blend.components[1]?.fiber_code, "elastane");
    const pes = parseCompositionText("100% PES");
    assert.equal(pes.components[0]?.fiber_code, "polyester");
    const nylon = parseCompositionText("100% Nylon");
    assert.equal(nylon.components[0]?.fiber_code, "nylon");
    const slash = parseCompositionText("PA/EA");
    assert.equal(slash.components.map((row) => row.fiber_code).join("/"), "polyamide/elastane");
  });

  it("applies org-scoped aliases after the global ontology", () => {
    const parsed = parseCompositionText("100% millfibre", null, { millfibre: "lyocell" });
    assert.equal(parsed.components[0]?.fiber_code, "lyocell");
  });

  it("keeps Atlas lining/spandex behaviour", () => {
    const jean = parseCompositionText("95% cotton 5% spandex");
    assert.equal(jean.components.map((row) => row.fiber_code).join("/"), "cotton/elastane");
    const jacket = parseCompositionText("Shell: 100% linen; Lining: 100% viscose");
    assert.equal(jacket.components[0]?.fiber_code, "linen");
    assert.match(jacket.normalization_warnings.join(" "), /Lining/);
  });
});

describe("Saved source mappings", () => {
  it("fingerprints schemas independently of column order", () => {
    assert.equal(
      schemaFingerprint(["STYLE_NO", "FIBER_COMP_1", "COLOUR"]),
      schemaFingerprint(["COLOUR", "FIBER_COMP_1", "STYLE_NO"])
    );
  });

  it("reuses an approved mapping on the same headers", () => {
    const saved = {
      STYLE_NO: "style_code",
      FIBER_COMP_1: "composition",
      COLOUR: "variant",
    };
    const remapped = remapSavedMapping(["Style No", "FIBER_COMP_1", "Colour"], saved);
    const preview = mappingForPreview(["Style No", "FIBER_COMP_1", "Colour"], undefined, remapped);
    assert.equal(preview.mappingSource, "saved_template");
    assert.equal(preview.mapping["Style No"], "style_code");
    assert.equal(preview.mapping.FIBER_COMP_1, "composition");
    assert.equal(preview.mapping.Colour, "variant");
  });

  it("does not let an empty operator mapping wipe a saved template", () => {
    const saved = { SKU: "sku", Composition: "composition" };
    const preview = mappingForPreview(["SKU", "Composition", "Notes"], {}, saved);
    assert.equal(preview.mapping.SKU, "sku");
    assert.equal(preview.mapping.Composition, "composition");
  });
});

describe("Learning loop promotion guard", () => {
  it("rejects automatic global promotion", () => {
    assert.throws(
      () => assertNotGlobalPromotion({ scope: "global", organizationId: null }),
      /must not be promoted to global/
    );
    assert.doesNotThrow(() =>
      assertNotGlobalPromotion({ scope: "organization", organizationId: "org-1" })
    );
  });
});

describe("Intelligence SQL and loaders stay fail-closed", () => {
  it("records ontology and ruleset on new passport snapshots", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/publish.ts"), "utf8");
    assert.match(src, /ITX_ONTOLOGY_VERSION/);
    assert.match(src, /ITX_RULESET_VERSION/);
    assert.match(src, /ontology_version/);
  });

  it("does not query customer tables from consumer-intelligence", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/consumer-intelligence.ts"), "utf8");
    assert.doesNotMatch(src, /from\("products"\)/);
    assert.doesNotMatch(src, /from\("source_records"\)/);
    assert.doesNotMatch(src, /SUPABASE_URL/);
    assert.match(src, /consumer_intelligence_aggregates/);
  });

  it("pipeline writes ontology provenance and saves mapping templates", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/pipeline.ts"), "utf8");
    assert.match(src, /ontologyVersion: ITX_ONTOLOGY_VERSION/);
    assert.match(src, /rememberMappingTemplate/);
    assert.match(src, /recordNormalizationCandidate/);
    assert.doesNotMatch(src, /openai|anthropic/i);
  });
});
