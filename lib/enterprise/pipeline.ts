import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCompositionText, isKnownMaterialCode } from "../material-intelligence/composition";
import { canAddProducts, entitlementsForPlan, type PlanKey } from "./entitlements";
import { applyColumnMapping } from "./import-preview";
import { ITX_RULESET_VERSION, type IntelligenceKind } from "./intelligence";
import {
  findApprovedCompositionRule,
  loadApprovedOrgAliases,
  recordNormalizationCandidate,
} from "./learning-loop";
import { rememberMappingTemplate } from "./mapping-templates";
import { ITX_ONTOLOGY_VERSION } from "./ontology";
import { markPassportUpdateRequired } from "./publish";
import {
  buildIdentifierIssueDetail,
  identifierClassLabel,
  planIdentifierRows,
  snapshotFromMapped,
  type IdentifierFate,
  type IdentifierSnapshot,
} from "./identity-reconciliation";

export const PHASE1_REQUIRED_FIELDS = ["name", "composition"] as const;

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function mappedValue(row: Record<string, string>, key: string): string {
  return String(row[key] || "").trim();
}

export async function loadExistingMatchKeys(
  client: SupabaseClient,
  organizationId: string
): Promise<Set<string>> {
  const keys = new Set<string>();
  const [{ data: products }, { data: identifiers }] = await Promise.all([
    client.from("products").select("sku, style_code").eq("organization_id", organizationId),
    client
      .from("product_identifiers")
      .select("identifier_value")
      .eq("organization_id", organizationId)
      .eq("active", true),
  ]);
  for (const row of products || []) {
    if (row.sku) keys.add(String(row.sku).toLowerCase());
    if (row.style_code) keys.add(String(row.style_code).toLowerCase());
  }
  for (const row of identifiers || []) {
    keys.add(String(row.identifier_value).toLowerCase());
  }
  return keys;
}

export async function loadCatalogIdentities(
  client: SupabaseClient,
  organizationId: string
): Promise<IdentifierSnapshot[]> {
  const [{ data: products }, { data: identifiers }] = await Promise.all([
    client
      .from("products")
      .select("id, name, sku, style_code")
      .eq("organization_id", organizationId)
      .eq("lifecycle", "active"),
    client
      .from("product_identifiers")
      .select("product_id, identifier_value")
      .eq("organization_id", organizationId)
      .eq("identifier_type", "gtin")
      .eq("active", true),
  ]);
  const gtinByProduct = new Map<string, string>();
  for (const row of identifiers || []) {
    if (row.product_id && !gtinByProduct.has(row.product_id)) {
      gtinByProduct.set(row.product_id, String(row.identifier_value));
    }
  }
  return (products || []).map((row) => ({
    productId: String(row.id),
    name: String(row.name || ""),
    sku: String(row.sku || ""),
    style: String(row.style_code || ""),
    gtin: gtinByProduct.get(row.id) || "",
    variant: "",
  }));
}

async function upsertField(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    productId: string;
    sourceRecordId: string;
    fieldKey: string;
    original: string;
    normalized: string;
    state: string;
    explanation: string;
    method: string;
    intelligenceKind: IntelligenceKind;
    ontologyVersion?: string | null;
    ruleId?: string | null;
  }
) {
  const extra = {
    ontology_version: input.ontologyVersion || null,
    rule_id: input.ruleId || null,
    intelligence_kind: input.intelligenceKind,
  };
  const base = {
    original_value: input.original,
    normalized_value: input.normalized,
    source_record_id: input.sourceRecordId,
    state: input.state,
    explanation: input.explanation,
    transformation_method: input.method,
    confidence: input.method === "deterministic" ? 1 : null,
  };
  const { data: existing } = await supabase
    .from("normalized_fields")
    .select("id, locked, normalized_value")
    .eq("organization_id", input.organizationId)
    .eq("product_id", input.productId)
    .eq("field_key", input.fieldKey)
    .maybeSingle();
  if (existing?.locked && existing.normalized_value !== input.normalized) {
    await supabase.from("issues").insert({
      organization_id: input.organizationId,
      product_id: input.productId,
      issue_type: "conflict",
      severity: "high",
      title: `Locked ${input.fieldKey} differs from new source`,
      original_value: existing.normalized_value,
      interpreted_value: input.normalized,
      status: "open",
    });
    return;
  }
  if (existing?.id && !existing.locked) {
    const updated = await supabase
      .from("normalized_fields")
      .update({ ...base, ...extra })
      .eq("id", existing.id);
    if (updated.error) {
      await supabase.from("normalized_fields").update(base).eq("id", existing.id);
    }
    return;
  }
  if (!existing?.id) {
    const inserted = await supabase.from("normalized_fields").insert({
      organization_id: input.organizationId,
      product_id: input.productId,
      source_record_id: input.sourceRecordId,
      field_key: input.fieldKey,
      access_class: input.fieldKey === "name" || input.fieldKey === "composition" ? "public" : "internal",
      ...base,
      ...extra,
    });
    if (inserted.error) {
      await supabase.from("normalized_fields").insert({
        organization_id: input.organizationId,
        product_id: input.productId,
        source_record_id: input.sourceRecordId,
        field_key: input.fieldKey,
        access_class: input.fieldKey === "name" || input.fieldKey === "composition" ? "public" : "internal",
        ...base,
      });
    }
  }
}

async function addIssue(
  supabase: SupabaseClient,
  row: {
    organizationId: string;
    productId: string;
    type: string;
    title: string;
    original?: string;
    interpreted?: string;
    severity?: string;
    detail?: string;
  }
) {
  await supabase.from("issues").insert({
    organization_id: row.organizationId,
    product_id: row.productId,
    issue_type: row.type,
    severity: row.severity || "medium",
    title: row.title,
    original_value: row.original || null,
    interpreted_value: row.interpreted || null,
    detail: row.detail || null,
    status: "open",
  });
}

export async function commitMappedImport(input: {
  client: SupabaseClient;
  organizationId: string;
  organizationPlan: string;
  productAllowance: number | null;
  filename: string;
  mapping: Record<string, string>;
  rows: Array<Record<string, string>>;
}): Promise<{
  importId: string;
  productsTouched: number;
  issuesCreated: number;
  reconciliations: IdentifierFate[];
  alreadyImported?: boolean;
}> {
  const supabase = input.client;

  const entitlement = entitlementsForPlan(input.organizationPlan as PlanKey, {
    productAllowance: input.productAllowance,
  });
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId);
  const currentCount = count || 0;

  const mappedRows = input.rows.map((row) => applyColumnMapping(row, input.mapping));
  const newNeeded = mappedRows.filter((row) => !mappedValue(row, "sku") && !mappedValue(row, "gtin")).length;
  if (!canAddProducts(entitlement, currentCount) && newNeeded > 0) {
    throw new Error("Product allowance reached for this plan.");
  }

  const { data: catalog } = await supabase
    .from("catalogs")
    .select("id")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  let catalogId = catalog?.id as string | undefined;
  if (!catalogId) {
    const { data: createdCatalog } = await supabase
      .from("catalogs")
      .insert({ organization_id: input.organizationId, name: "Main catalog" })
      .select("id")
      .maybeSingle();
    catalogId = createdCatalog?.id;
  }

  const idempotencyKey = sha(
    JSON.stringify({ mapping: input.mapping, hashes: input.rows.map((row) => sha(JSON.stringify(row))) })
  );
  const { data: existingImport } = await supabase
    .from("imports")
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingImport?.status === "succeeded") {
    return {
      importId: existingImport.id,
      productsTouched: 0,
      issuesCreated: 0,
      reconciliations: [],
      alreadyImported: true,
    };
  }

  const { data: profile } = await supabase.from("profiles").select("id").maybeSingle();

  const { data: importRow, error: importError } = await supabase
    .from("imports")
    .insert({
      organization_id: input.organizationId,
      catalog_id: catalogId || null,
      idempotency_key: idempotencyKey,
      original_filename: input.filename,
      mapping: input.mapping,
      status: "running",
      created_by: profile?.id || null,
    })
    .select("id")
    .maybeSingle();
  if (importError || !importRow?.id) throw new Error(importError?.message || "Import insert failed.");

  await supabase.from("processing_jobs").insert({
    organization_id: input.organizationId,
    import_id: importRow.id,
    job_type: "import_pipeline",
    stage: "parsing",
    status: "running",
    idempotency_key: `${idempotencyKey}:job`,
  });

  let productsTouched = 0;
  let issuesCreated = 0;
  const orgAliases = await loadApprovedOrgAliases(supabase, input.organizationId);
  const unknownTokens = new Set<string>();
  const workingIdentities = await loadCatalogIdentities(supabase, input.organizationId);
  const reconciliations: IdentifierFate[] = [];
  let rowIndex = -1;

  for (const raw of input.rows) {
    const mapped = applyColumnMapping(raw, input.mapping);
    const name = mappedValue(mapped, "name") || mappedValue(mapped, "sku") || "Untitled product";
    const sku = mappedValue(mapped, "sku");
    const gtin = mappedValue(mapped, "gtin");
    const style = mappedValue(mapped, "style_code");
    const category = mappedValue(mapped, "category");
    const composition = mappedValue(mapped, "composition");
    const country = mappedValue(mapped, "manufacturing_country");
    const variantName = mappedValue(mapped, "variant");

    const incoming = snapshotFromMapped(mapped, { rowIndex: ++rowIndex });
    const fate = planIdentifierRows([incoming], workingIdentities)[0];
    let productId = fate.matched?.productId || "";
    if (fate.action === "update_same_product" && productId) {
      await supabase
        .from("products")
        .update({
          name,
          sku: sku || undefined,
          style_code: style || undefined,
          category: category || undefined,
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .eq("organization_id", input.organizationId);
      await markPassportUpdateRequired(supabase, input.organizationId, productId);
      const existingIdx = workingIdentities.findIndex((row) => row.productId === productId);
      if (existingIdx >= 0) {
        workingIdentities[existingIdx] = {
          ...workingIdentities[existingIdx],
          name,
          sku: sku || workingIdentities[existingIdx].sku,
          style: style || workingIdentities[existingIdx].style,
          gtin: gtin || workingIdentities[existingIdx].gtin,
          variant: variantName || workingIdentities[existingIdx].variant,
        };
      }
      reconciliations.push(fate);
    } else {
      if (entitlement.productAllowance != null && currentCount + productsTouched >= entitlement.productAllowance) {
        continue;
      }
      const { data: created, error } = await supabase
        .from("products")
        .insert({
          organization_id: input.organizationId,
          catalog_id: catalogId || null,
          name,
          sku: sku || null,
          style_code: style || null,
          category: category || null,
        })
        .select("id")
        .maybeSingle();
      if (error || !created?.id) continue;
      productId = created.id;
      incoming.productId = productId;
      const forWorking = {
        ...incoming,
        gtin: fate.action === "create_with_collision" && fate.matchOn === "gtin" ? "" : incoming.gtin,
      };
      workingIdentities.push(forWorking);
      if (fate.action === "create_with_collision" && fate.classification) {
        const detail = buildIdentifierIssueDetail({
          classification: fate.classification,
          matchOn: fate.matchOn,
          identifierValue: fate.identifierValue,
          matchedProductId: fate.matched?.productId || null,
          incoming,
          matched: fate.matched,
        });
        await addIssue(supabase, {
          organizationId: input.organizationId,
          productId,
          type: "identifier",
          title: identifierClassLabel(fate.classification),
          original: fate.identifierValue || gtin || sku || style,
          interpreted: fate.matchedLabel || "",
          severity: fate.classification === "ambiguous_collision" ? "critical" : "medium",
          detail: JSON.stringify(detail),
        });
        issuesCreated += 1;
        reconciliations.push({ ...fate, incoming });
      }
    }
    productsTouched += 1;

    let variantId: string | null = null;
    if (sku) {
      const { data: variant } = await supabase
        .from("variants")
        .upsert(
          {
            organization_id: input.organizationId,
            product_id: productId,
            name: variantName || null,
            sku,
            gtin: gtin || null,
          },
          { onConflict: "organization_id,product_id,sku" }
        )
        .select("id")
        .maybeSingle();
      variantId = variant?.id || null;
    }

    const payloadHash = sha(JSON.stringify(raw));
    const { data: source, error: sourceError } = await supabase
      .from("source_records")
      .insert({
        organization_id: input.organizationId,
        import_id: importRow.id,
        product_id: productId,
        variant_id: variantId,
        source_system: "upload",
        original_payload: raw,
        payload_hash: payloadHash,
        retrieved_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (sourceError || !source?.id) continue;

    if (gtin && !(fate.action === "create_with_collision" && fate.matchOn === "gtin")) {
      const { data: existingGtin } = await supabase
        .from("product_identifiers")
        .select("product_id")
        .eq("organization_id", input.organizationId)
        .eq("identifier_type", "gtin")
        .eq("identifier_value", gtin)
        .eq("active", true)
        .maybeSingle();
      if (existingGtin && existingGtin.product_id !== productId) {
        await addIssue(supabase, {
          organizationId: input.organizationId,
          productId,
          type: "identifier",
          title: "GTIN collided with another product",
          original: gtin,
          severity: "critical",
        });
        issuesCreated += 1;
      } else if (!existingGtin) {
        const { error: idError } = await supabase.from("product_identifiers").insert({
          organization_id: input.organizationId,
          product_id: productId,
          variant_id: variantId,
          identifier_type: "gtin",
          identifier_value: gtin,
          issuing_system: "upload",
        });
        if (idError) {
          await addIssue(supabase, {
            organizationId: input.organizationId,
            productId,
            type: "identifier",
            title: "GTIN collided with another product",
            original: gtin,
            severity: "critical",
          });
          issuesCreated += 1;
        }
      }
    }

    const approvedComposition = composition
      ? await findApprovedCompositionRule(supabase, input.organizationId, composition)
      : null;
    const parsed = approvedComposition
      ? {
          components: [
            {
              fiber_code: "custom",
              fiber_name: approvedComposition.canonical,
              percentage: null as number | null,
              raw_value: composition,
            },
          ],
          primary_fiber: null,
          natural_fiber_percentage: null,
          total_percentage: null,
          normalization_warnings: [] as string[],
        }
      : parseCompositionText(composition || null, null, orgAliases);
    const compositionState = !composition
      ? "missing"
      : parsed.normalization_warnings.length
        ? "unverified"
        : parsed.components.length
          ? "normalized"
          : "observed";
    const compositionNormalized = approvedComposition
      ? approvedComposition.canonical
      : parsed.components
          .map((part) =>
            part.percentage != null ? `${part.percentage}% ${part.fiber_name}` : part.fiber_name
          )
          .join(" / ");

    for (const part of parsed.components) {
      if (
        !approvedComposition &&
        part.fiber_code &&
        part.fiber_code !== "unknown" &&
        !isKnownMaterialCode(part.fiber_code)
      ) {
        unknownTokens.add(`${part.fiber_code}\t${part.raw_value || part.fiber_code}`);
      }
    }

    await upsertField(supabase, {
      organizationId: input.organizationId,
      productId,
      sourceRecordId: source.id,
      fieldKey: "name",
      original: name,
      normalized: name,
      state: "observed",
      explanation: "Copied from source name/SKU.",
      method: "deterministic",
      intelligenceKind: "observed",
    });
    if (composition) {
      await upsertField(supabase, {
        organizationId: input.organizationId,
        productId,
        sourceRecordId: source.id,
        fieldKey: "composition",
        original: composition,
        normalized: compositionNormalized || composition,
        state: compositionState,
        explanation:
          parsed.normalization_warnings.join(" ") ||
          `Deterministic composition parse. ontology=${ITX_ONTOLOGY_VERSION} ruleset=${ITX_RULESET_VERSION}`,
        method: "deterministic",
        intelligenceKind: "normalized",
        ontologyVersion: ITX_ONTOLOGY_VERSION,
        ruleId: approvedComposition?.id || null,
      });
    } else {
      await addIssue(supabase, {
        organizationId: input.organizationId,
        productId,
        type: "missing_data",
        title: "Composition missing",
        severity: "high",
      });
      issuesCreated += 1;
      await supabase.from("missing_data_register").insert({
        organization_id: input.organizationId,
        product_id: productId,
        field_key: "composition",
        why_it_matters: "Digital Product Passports require material composition when applicable.",
        suggested_source: "Product spec sheet or supplier declaration",
        owner_role: "product_manager",
      });
    }

    if (parsed.total_percentage != null && Math.abs(parsed.total_percentage - 100) > 0.5) {
      await addIssue(supabase, {
        organizationId: input.organizationId,
        productId,
        type: "validation",
        title: "Composition percentages do not total 100",
        original: composition,
        interpreted: String(parsed.total_percentage),
        severity: "critical",
      });
      issuesCreated += 1;
    }

    if (country) {
      await upsertField(supabase, {
        organizationId: input.organizationId,
        productId,
        sourceRecordId: source.id,
        fieldKey: "manufacturing_country",
        original: country,
        normalized: country.toUpperCase(),
        state: "observed",
        explanation: "Copied from source; not inferred.",
        method: "deterministic",
        intelligenceKind: "normalized",
      });
    } else {
      await addIssue(supabase, {
        organizationId: input.organizationId,
        productId,
        type: "missing_data",
        title: "Manufacturing country / origin missing",
        severity: "high",
      });
      issuesCreated += 1;
      await supabase.from("missing_data_register").insert({
        organization_id: input.organizationId,
        product_id: productId,
        field_key: "manufacturing_country",
        why_it_matters: "Origin is required before a Phase 1 passport can be represented as complete.",
        suggested_source: "Supplier declaration or cutting ticket",
        owner_role: "product_manager",
      });
    }

    const { count: openCritical } = await supabase
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", input.organizationId)
      .eq("product_id", productId)
      .eq("status", "open")
      .in("severity", ["critical", "high"]);

    await supabase
      .from("products")
      .update({
        data_completeness: composition ? 0.6 : 0.3,
        passport_state: openCritical ? "review_required" : composition ? "review_required" : "incomplete",
      })
      .eq("id", productId);
  }

  for (const token of unknownTokens) {
    const [code, raw] = token.split("\t");
    await recordNormalizationCandidate({
      client: supabase,
      organizationId: input.organizationId,
      fieldKey: "material_alias",
      original: raw || code,
      canonical: code,
      source: "unknown_token",
      status: "observed",
    });
  }

  const columns = Array.from(new Set(input.rows.flatMap((row) => Object.keys(row))));
  await rememberMappingTemplate({
    client: supabase,
    organizationId: input.organizationId,
    columns,
    mapping: input.mapping,
    approvedBy: profile?.id || null,
  });

  await supabase.from("imports").update({ status: "succeeded" }).eq("id", importRow.id);
  await supabase
    .from("processing_jobs")
    .update({ status: "succeeded", stage: "validation", finished_at: new Date().toISOString() })
    .eq("import_id", importRow.id);
  const sameProductUpdates = reconciliations.filter((row) => row.action === "update_same_product").length;
  const collisionsKept = reconciliations.filter((row) => row.action === "create_with_collision").length;
  await supabase.from("activity_events").insert({
    organization_id: input.organizationId,
    actor_id: profile?.id || null,
    title: `Imported ${productsTouched} products from ${input.filename}`,
    detail: `${sameProductUpdates} same-product updates · ${collisionsKept} identifier collisions kept separate until confirmed`,
  });

  return { importId: importRow.id, productsTouched, issuesCreated, reconciliations };
}
