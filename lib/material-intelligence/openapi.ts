import { MATERIAL_API_VERSION, DPP_ALIGNMENT_NOTICE, DPP_FRAMEWORK } from "./types";
import { DEMO_GTIN_MISSING, DEMO_GTIN_REPORTED, DEMO_GTIN_VERIFIED } from "./demo-records";

export function materialOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "INTERTEXE Material Intelligence API",
      version: MATERIAL_API_VERSION,
      description:
        "Send a GTIN. Receive normalized fibre composition, evidence status and a DPP-readiness map. INTERTEXE does not provide legal certification.",
    },
    servers: [{ url: "https://www.intertexe.com", description: "Production" }],
    paths: {
      "/api/v1/composition/{gtin}": {
        get: {
          operationId: "getComposition",
          summary: "Look up composition by GTIN",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "gtin",
              in: "path",
              required: true,
              schema: { type: "string", pattern: "^\\d{8}$|^\\d{12}$|^\\d{13}$|^\\d{14}$" },
              description: "GTIN-8, GTIN-12, GTIN-13 or GTIN-14. Leading zeroes are significant.",
            },
          ],
          responses: {
            "200": {
              description: "Lookup completed. not_found is a 200 with empty composition.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
            },
            "401": { description: "Missing or invalid API key" },
            "403": { description: "Revoked key" },
            "422": { description: "Invalid GTIN" },
            "429": { description: "Rate limit" },
          },
        },
      },
      "/api/v1/demo/composition/{gtin}": {
        get: {
          operationId: "getDemoComposition",
          summary: "Public demonstration lookup (allowlisted sample records only)",
          parameters: [
            {
              name: "gtin",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: `Curated samples: ${DEMO_GTIN_VERIFIED}, ${DEMO_GTIN_REPORTED}, ${DEMO_GTIN_MISSING}`,
            },
          ],
          responses: {
            "200": {
              description: "Demonstration record",
              content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
            },
            "422": { description: "Invalid GTIN" },
            "429": { description: "Rate limit" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "itx_live_ or itx_test_ key" },
      },
      schemas: {
        SuccessEnvelope: {
          type: "object",
          required: ["api_version", "request_id", "data"],
          properties: {
            api_version: { type: "string", const: MATERIAL_API_VERSION },
            request_id: { type: "string" },
            data: { $ref: "#/components/schemas/LookupData" },
          },
        },
        LookupData: {
          type: "object",
          required: ["match_status", "match_type", "product", "composition", "evidence", "dpp_alignment"],
          properties: {
            match_status: { enum: ["matched", "manufacturer_only", "not_found"] },
            match_type: {
              enum: ["exact_gtin", "exact_sku", "exact_product_url", "manufacturer_only", "not_found"],
            },
            product: {
              type: "object",
              required: ["gtin"],
              properties: {
                gtin: { type: "string" },
                brand: { type: ["string", "null"] },
                name: { type: ["string", "null"] },
                sku: { type: ["string", "null"] },
              },
            },
            composition: { $ref: "#/components/schemas/Composition" },
            evidence: { $ref: "#/components/schemas/Evidence" },
            dpp_alignment: { $ref: "#/components/schemas/DppAlignment" },
            message: { type: "string" },
          },
        },
        Composition: {
          type: "object",
          required: ["components", "primary_fiber", "natural_fiber_percentage", "total_percentage", "normalization_warnings"],
          properties: {
            components: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  fiber_code: { type: "string" },
                  fiber_name: { type: "string" },
                  percentage: { type: ["number", "null"] },
                  raw_value: { type: ["string", "null"] },
                },
              },
            },
            primary_fiber: { type: ["string", "null"] },
            natural_fiber_percentage: { type: ["number", "null"] },
            total_percentage: { type: ["number", "null"] },
            normalization_warnings: { type: "array", items: { type: "string" } },
          },
        },
        Evidence: {
          type: "object",
          required: ["status", "sources", "last_updated"],
          properties: {
            status: {
              enum: [
                "verified_label",
                "reported_brand",
                "reported_retailer",
                "inferred",
                "unknown_legacy",
                "missing",
              ],
            },
            sources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  captured_at: { type: ["string", "null"] },
                  reviewed_at: { type: ["string", "null"] },
                },
              },
            },
            last_updated: { type: ["string", "null"] },
          },
        },
        DppAlignment: {
          type: "object",
          required: ["framework", "status", "available_fields", "missing_fields", "notice"],
          properties: {
            framework: { type: "string", const: DPP_FRAMEWORK },
            status: { enum: ["mapped", "partial", "insufficient"] },
            available_fields: { type: "array", items: { type: "string" } },
            missing_fields: { type: "array", items: { type: "string" } },
            notice: { type: "string", const: DPP_ALIGNMENT_NOTICE },
          },
        },
        ErrorEnvelope: {
          type: "object",
          required: ["api_version", "request_id", "error"],
          properties: {
            api_version: { type: "string" },
            request_id: { type: "string" },
            error: {
              type: "object",
              required: ["code", "message"],
              properties: { code: { type: "string" }, message: { type: "string" } },
            },
          },
        },
      },
    },
  } as const;
}

export function assertEnvelopeMatchesOpenApi(body: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (body.api_version !== MATERIAL_API_VERSION) errors.push("api_version");
  if (typeof body.request_id !== "string" || !body.request_id) errors.push("request_id");
  if (body.data) {
    const data = body.data as Record<string, unknown>;
    for (const key of ["match_status", "match_type", "product", "composition", "evidence", "dpp_alignment"]) {
      if (!(key in data)) errors.push(`data.${key}`);
    }
  } else if (!body.error) {
    errors.push("data_or_error");
  }
  return errors;
}
