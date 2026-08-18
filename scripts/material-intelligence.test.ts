import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { createMockSupabase } from "./material-api-mock.ts";
import { appendGtinCheckDigit } from "../lib/gtin.ts";
import { generateApiKey, hashApiKey, looksLikeApiKey } from "../lib/material-intelligence/keys.ts";
import { authenticateMaterialKey, enforceRateLimit } from "../lib/material-intelligence/auth.ts";
import {
  assertNoGuessedComposition,
  lookupProductionComposition,
  manufacturerOnlyResult,
  notFoundResult,
} from "../lib/material-intelligence/lookup.ts";
import { handleAuthenticatedCompositionGet } from "../app/api/v1/composition/[gtin]/route.ts";
import { parseLeadBody } from "../app/api/v1/leads/route.ts";
import { DEMO_GTIN_VERIFIED } from "../lib/material-intelligence/demo-records.ts";
import { assertEnvelopeMatchesOpenApi } from "../lib/material-intelligence/openapi.ts";

function authClient(rawKey: string, extras?: { status?: string; usage?: number; monthly?: number }) {
  const hash = hashApiKey(rawKey);
  const minuteAgoIso = new Date(Date.now() - 10_000).toISOString();
  const usage = Array.from({ length: extras?.usage || 0 }, (_, i) => ({
    id: `u${i}`,
    key_id: "key-1",
    client_id: "client-1",
    created_at: minuteAgoIso,
    status_code: 200,
  }));
  return createMockSupabase({
    material_api_keys: [
      {
        id: "key-1",
        client_id: "client-1",
        key_hash: hash,
        status: extras?.status || "active",
        expires_at: null,
        material_api_clients: {
          id: "client-1",
          plan: "founding_pilot",
          rate_limit_per_minute: 2,
          monthly_limit: extras?.monthly || 5000,
          is_active: true,
        },
      },
    ],
    material_api_usage: usage,
    material_evidence: [],
    barcode_compositions: [],
    products: [],
    upc_brand_prefixes: [],
  });
}

describe("API keys", () => {
  it("hashes keys and never treats a hash as a bearer secret", () => {
    const generated = generateApiKey("live");
    assert.equal(looksLikeApiKey(generated.raw), true);
    assert.equal(generated.hash, hashApiKey(generated.raw));
    assert.notEqual(generated.hash, generated.raw);
    assert.equal(generated.raw.includes(generated.hash), false);
    assert.equal(generated.prefix.startsWith("itx_live_"), true);
    assert.equal(generated.lastFour, generated.raw.slice(-4));
  });
});

describe("Authentication", () => {
  it("rejects missing, invalid, and revoked keys", async () => {
    const generated = generateApiKey("live");
    const supabase = authClient(generated.raw);
    const missing = await authenticateMaterialKey(supabase as never, null);
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.status, 401);

    const invalid = await authenticateMaterialKey(supabase as never, `Bearer ${generateApiKey("live").raw}`);
    assert.equal(invalid.ok, false);
    if (!invalid.ok) assert.equal(invalid.status, 401);

    const revokedStore = authClient(generated.raw, { status: "revoked" });
    const revoked = await authenticateMaterialKey(
      revokedStore as never,
      `Bearer ${generated.raw}`
    );
    assert.equal(revoked.ok, false);
    if (!revoked.ok) {
      assert.equal(revoked.status, 403);
      assert.equal(revoked.code, "revoked");
    }

    const ok = await authenticateMaterialKey(supabase as never, `Bearer ${generated.raw}`);
    assert.equal(ok.ok, true);
  });

  it("returns 429 when the per-minute limit is exhausted", async () => {
    const generated = generateApiKey("test");
    const supabase = authClient(generated.raw, { usage: 2 });
    const auth = await authenticateMaterialKey(supabase as never, `Bearer ${generated.raw}`);
    assert.equal(auth.ok, true);
    if (!auth.ok) return;
    const limited = await enforceRateLimit(supabase as never, auth);
    assert.equal(limited.ok, false);
  });
});

describe("Production lookup", () => {
  it("returns exact GTIN matches without upgrading scan data to verified_label", async () => {
    const gtin = DEMO_GTIN_VERIFIED;
    const supabase = createMockSupabase({
      material_evidence: [],
      barcode_compositions: [
        {
          upc_code: gtin,
          brand: "Catalog Brand",
          product_name: "Stored Skirt",
          composition: "96% silk, 4% elastane",
          source: "user_scan",
          verified_by: "user_scan",
        },
      ],
      products: [],
      upc_brand_prefixes: [],
    });
    const data = await lookupProductionComposition(supabase as never, gtin);
    assert.equal(data.match_type, "exact_gtin");
    assert.equal(data.evidence.status, "unknown_legacy");
    assert.ok(data.composition.components.length > 0);
    assert.equal(data.composition.components.some((c) => c.fiber_code === "silk"), true);
  });

  it("maps affiliate/retailer rows to reported_retailer", async () => {
    const gtin = appendGtinCheckDigit("020000000003");
    const supabase = createMockSupabase({
      material_evidence: [],
      barcode_compositions: [
        {
          upc_code: gtin,
          brand: "Retailer Brand",
          product_name: "Shirt",
          composition: "100% cotton",
          source: "affiliate_feed",
        },
      ],
      products: [],
      upc_brand_prefixes: [],
    });
    const data = await lookupProductionComposition(supabase as never, gtin);
    assert.equal(data.evidence.status, "reported_retailer");
    assert.notEqual(data.evidence.status, "verified_label");
  });

  it("returns manufacturer_only with empty composition from a validated prefix table", async () => {
    const gtin = appendGtinCheckDigit("123456789012");
    const supabase = createMockSupabase({
      material_evidence: [],
      barcode_compositions: [],
      products: [],
      upc_brand_prefixes: [{ prefix: gtin.slice(0, 6), brand_name: "Validated Prefix Co" }],
    });
    const data = await lookupProductionComposition(supabase as never, gtin);
    assert.equal(data.match_type, "manufacturer_only");
    assert.equal(data.product.brand, "Validated Prefix Co");
    assert.equal(data.composition.components.length, 0);
    assert.equal(assertNoGuessedComposition(data), true);
    assert.equal(data.composition.total_percentage, null);
  });

  it("returns not_found with no guessed composition", async () => {
    const gtin = appendGtinCheckDigit("888888888888");
    const supabase = createMockSupabase({
      material_evidence: [],
      barcode_compositions: [],
      products: [],
      upc_brand_prefixes: [],
    });
    const data = await lookupProductionComposition(supabase as never, gtin);
    assert.equal(data.match_type, "not_found");
    assert.equal(data.composition.components.length, 0);
    assert.equal(assertNoGuessedComposition(data), true);
  });

  it("requires reviewed_at before emitting verified_label from an evidence row", async () => {
    const gtin = DEMO_GTIN_VERIFIED;
    const supabase = createMockSupabase({
      material_evidence: [
        {
          upc_code: gtin,
          source_type: "physical_label_scan",
          status: "verified_label",
          reviewed_at: null,
        },
      ],
      barcode_compositions: [
        {
          upc_code: gtin,
          brand: "X",
          product_name: "Y",
          composition: "100% silk",
          source: "user_scan",
        },
      ],
      products: [],
      upc_brand_prefixes: [],
    });
    const data = await lookupProductionComposition(supabase as never, gtin);
    assert.equal(data.evidence.status, "unknown_legacy");
  });
});

describe("Production HTTP handler", () => {
  it("requires a bearer key and returns request ids without secrets", async () => {
    const req = new NextRequest("https://www.intertexe.com/api/v1/composition/0123456789012");
    const res = await handleAuthenticatedCompositionGet(req, {
      params: Promise.resolve({ gtin: "0123456789012" }),
    }, authClient(generateApiKey("live").raw) as never);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "unauthorized");
    assert.ok(body.request_id);
    assert.equal(res.headers.get("x-request-id"), body.request_id);
    assert.equal("stack" in body, false);
    assert.doesNotMatch(JSON.stringify(body), /service_role|SUPABASE/i);
    assert.deepEqual(assertEnvelopeMatchesOpenApi(body), []);
  });

  it("returns 403 for revoked keys", async () => {
    const generated = generateApiKey("live");
    const req = new NextRequest("https://www.intertexe.com/api/v1/composition/0123456789012", {
      headers: { authorization: `Bearer ${generated.raw}` },
    });
    const res = await handleAuthenticatedCompositionGet(
      req,
      { params: Promise.resolve({ gtin: "0123456789012" }) },
      authClient(generated.raw, { status: "revoked" }) as never
    );
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, "revoked");
  });

  it("returns 429 when rate limited", async () => {
    const generated = generateApiKey("live");
    const req = new NextRequest("https://www.intertexe.com/api/v1/composition/0123456789012", {
      headers: { authorization: `Bearer ${generated.raw}` },
    });
    const res = await handleAuthenticatedCompositionGet(
      req,
      { params: Promise.resolve({ gtin: "0123456789012" }) },
      authClient(generated.raw, { usage: 2 }) as never
    );
    assert.equal(res.status, 429);
    assert.equal((await res.json()).error.code, "rate_limited");
  });

  it("returns 422 for invalid GTINs including the old demo identifier", async () => {
    const generated = generateApiKey("live");
    const req = new NextRequest("https://www.intertexe.com/api/v1/composition/0198765432104", {
      headers: { authorization: `Bearer ${generated.raw}` },
    });
    const res = await handleAuthenticatedCompositionGet(
      req,
      { params: Promise.resolve({ gtin: "0198765432104" }) },
      authClient(generated.raw) as never
    );
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, "invalid_gtin");
    assert.ok(res.headers.get("x-request-id"));
  });

  it("returns a versioned lookup for an exact match", async () => {
    const generated = generateApiKey("live");
    const hash = hashApiKey(generated.raw);
    const gtin = DEMO_GTIN_VERIFIED;
    const supabase = createMockSupabase({
      material_api_keys: [
        {
          id: "key-1",
          client_id: "client-1",
          key_hash: hash,
          status: "active",
          expires_at: null,
          material_api_clients: {
            id: "client-1",
            plan: "founding_pilot",
            rate_limit_per_minute: 60,
            monthly_limit: 5000,
            is_active: true,
          },
        },
      ],
      material_api_usage: [],
      material_evidence: [],
      barcode_compositions: [
        {
          upc_code: gtin,
          brand: "Catalog Brand",
          product_name: "Stored Skirt",
          composition: "96% silk 4% elastane",
          source: "products_catalog",
        },
      ],
      products: [],
      upc_brand_prefixes: [],
    });
    const req = new NextRequest(`https://www.intertexe.com/api/v1/composition/${gtin}`, {
      headers: { authorization: `Bearer ${generated.raw}` },
    });
    const res = await handleAuthenticatedCompositionGet(
      req,
      { params: Promise.resolve({ gtin }) },
      supabase as never
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.api_version, "v1");
    assert.equal(body.data.match_type, "exact_gtin");
    assert.equal(body.data.evidence.status, "reported_retailer");
    assert.deepEqual(assertEnvelopeMatchesOpenApi(body), []);
    assert.equal(assertNoGuessedComposition(body.data), true);
  });
});

describe("manufacturer_only contract", () => {
  it("never attaches composition", () => {
    const row = manufacturerOnlyResult("0123456789012", "Validated Prefix Co");
    assert.equal(row.composition.components.length, 0);
    assert.equal(row.composition.primary_fiber, null);
    assert.equal(notFoundResult("0123456789012").composition.components.length, 0);
  });
});

describe("Lead capture", () => {
  it("stores qualification fields and treats honeypots as silent success", () => {
    const honeypot = parseLeadBody({
      company_fax: "bot",
      first_name: "A",
      last_name: "B",
      email: "ops@brand.com",
      company: "Brand",
      intent: "snapshot",
    });
    assert.equal("honeypot" in honeypot, true);
    const ok = parseLeadBody({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@brand.com",
      company: "Brand",
      intent: "snapshot",
      source_cta: "hero",
    });
    assert.equal("row" in ok, true);
    if ("row" in ok) {
      assert.equal(ok.row.email, "ada@brand.com");
      assert.equal(ok.row.intent, "snapshot");
    }
  });
});
