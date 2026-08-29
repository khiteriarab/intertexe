#!/usr/bin/env node
/**
 * Unit tests for catalog browse speed contract.
 * Run: node --test scripts/guard-catalog-browse-speed.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import test from "node:test";
import {
  REPO_ROOT,
  validateTaxonomyBrowseSql,
  validateRepoCatalogBrowseSpeed,
  readCanonicalTaxonomyBrowseSql,
} from "./lib/catalog-browse-speed-contract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("canonical taxonomy browse SQL passes contract", () => {
  const sql = readCanonicalTaxonomyBrowseSql();
  const result = validateTaxonomyBrowseSql(sql, "canonical");
  assert.equal(result.ok, true, result.errors.join("; "));
});

test("price_hotfix migration fails contract (regression fixture)", () => {
  const p = path.join(
    REPO_ROOT,
    "supabase/migrations/20260829_catalog_taxonomy_browse_price_hotfix.sql"
  );
  const sql = readFileSync(p, "utf8");
  const result = validateTaxonomyBrowseSql(sql, "price_hotfix");
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("full-filtered-count") || e.includes("eligible-then-filtered")));
});

test("repo guard passes with speed lock as latest migration", () => {
  const result = validateRepoCatalogBrowseSpeed();
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.ok(
    result.notes.some((n) => n.includes("20260830_catalog_taxonomy_browse_speed_lock")),
    "expected speed lock migration to be effective"
  );
});

test("slow inline redefinition is rejected", () => {
  const bad = `
    CREATE OR REPLACE FUNCTION public.catalog_taxonomy_browse_page()
    RETURNS jsonb LANGUAGE plpgsql AS $$
    BEGIN
      WITH eligible AS (SELECT DISTINCT pta.offer_id FROM product_taxonomy_assignments pta),
      filtered AS (SELECT l.* FROM live_products_apparel l JOIN eligible e ON e.offer_id = l.id),
      counted AS (SELECT count(*)::bigint AS n FROM filtered),
      paged AS (SELECT * FROM filtered LIMIT 24)
      SELECT c.n FROM counted c LEFT JOIN LATERAL (SELECT * FROM paged) p ON true;
    END;
    $$;
  `;
  const result = validateTaxonomyBrowseSql(bad, "inline");
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 2);
});
