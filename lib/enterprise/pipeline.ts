import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCompositionText } from "../material-intelligence/composition";
import { getEnterpriseServiceClient } from "./client";
import { canAddProducts, entitlementsForPlan, type PlanKey } from "./entitlements";
import { applyColumnMapping } from "./import-preview";
import { markPassportUpdateRequired } from "./publish";

export const PHASE1_REQUIRED_FIELDS = ["name", "composition"] as const;

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function mappedValue(row: Record<string, string>, key: string): string {
  return String(row[key] || "").trim();
}

export async function loadExistingMatchKeys(organizationId: string): Promise<Set<string>> {
  const supabase = getEnterpriseServiceClient();
  const keys = new Set<string>();
  if (!supabase) return keys;
  const [{ data: products }, { data: identifiers }] = await Promise.all([
    supabase.from("products").select("sku, style_code").eq("organization_id", organizationId),
    supabase
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

async function findMatch(
  supabase: SupabaseClient,
  organizationId: string,
  mapped: Record<string, string>
): Promise<{ productId: string; ambiguous: boolean }> {
  const gtin = mappedValue(mapped, "gtin");
  const sku = mappedValue(mapped, "sku");
  const style = mappedValue(mapped, "style_code");
  if (gtin) {
    const { data } = await supabase
      .from("product_identifiers")
      .select("product_id")
      .eq("organization_id", organizationId)
      .eq("identifier_type", "gtin")
      .eq("identifier_value", gtin)
      .eq("active", true);
    const ids = Array.from(new Set((data || []).map((row) => row.product_id).filter(Boolean)));
    if (ids.length === 1) return { productId: String(ids[0]), ambiguous: false };
    if (ids.length > 1) return { productId: String(ids[0]), ambiguous: true };
  }
  if (sku) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("sku", sku);
    if (data?.length === 1) return { productId: data[0].id, ambiguous: false };
    if ((data?.length || 0) > 1) return { productId: data![0].id, ambiguous: true };
  }
  if (style) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("style_code", style);
    if (data?.length === 1) return { productId: data[0].id, ambiguous: false };
    if ((data?.length || 0) > 1) return { productId: data![0].id, ambiguous: true };
  }
  return { productId: "", ambiguous: false };
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
  }
) {
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
      severity: "medium",
      title: `Locked ${input.fieldKey} differs from new source`,
      original_value: existing.normalized_value,
      interpreted_value: input.normalized,
      status: "open",
    });
    return;
  }
  if (existing?.id && !existing.locked) {
    await supabase
      .from("normalized_fields")
      .update({
        original_value: input.original,
        normalized_value: input.normalized,
        source_record_id: input.sourceRecordId,
        state: input.state,
        explanation: input.explanation,
        transformation_method: input.method,
      })
      .eq("id", existing.id);
    return;
  }
  if (!existing?.id) {
    await supabase.from("normalized_fields").insert({
      organization_id: input.organizationId,
      product_id: input.productId,
      source_record_id: input.sourceRecordId,
      field_key: input.fieldKey,
      original_value: input.original,
      normalized_value: input.normalized,
      state: input.state,
      explanation: input.explanation,
      transformation_method: input.method,
      access_class: input.fieldKey === "name" || input.fieldKey === "composition" ? "public" : "internal",
      confidence: input.method === "deterministic" ? 1 : null,
    });
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
    status: "open",
  });
}

export async function commitMappedImport(input: {
  organizationId: string;
  organizationPlan: string;
  productAllowance: number | null;
  actorEmail: string;
  filename: string;
  mapping: Record<string, string>;
  rows: Array<Record<string, string>>;
}): Promise<{ importId: string; productsTouched: number; issuesCreated: number }> {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) throw new Error("Enterprise database is not linked.");

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
    JSON.stringify({ mapping: input.mapping, hashes: mappedRows.map((row) => sha(JSON.stringify(row))) })
  );
  const { data: existingImport } = await supabase
    .from("imports")
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingImport?.status === "succeeded") {
    return { importId: existingImport.id, productsTouched: 0, issuesCreated: 0 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", input.actorEmail.toLowerCase())
    .maybeSingle();

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

    const match = await findMatch(supabase, input.organizationId, mapped);
    let productId = match.productId;
    if (!productId) {
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
    } else {
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
      await markPassportUpdateRequired(input.organizationId, productId);
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

    if (match.ambiguous) {
      await addIssue(supabase, {
        organizationId: input.organizationId,
        productId,
        type: "identifier",
        title: "Ambiguous identifier match; records were not silently merged",
        original: gtin || sku || style,
        severity: "high",
      });
      issuesCreated += 1;
    }

    if (gtin) {
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

    const parsed = parseCompositionText(composition || null);
    const compositionState = !composition
      ? "missing"
      : parsed.normalization_warnings.length
        ? "unverified"
        : parsed.components.length
          ? "normalized"
          : "observed";
    const compositionNormalized = parsed.components
      .map((part) =>
        part.percentage != null ? `${part.percentage}% ${part.fiber_name}` : part.fiber_name
      )
      .join(" / ");

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
        explanation: parsed.normalization_warnings.join(" ") || "Deterministic composition parse.",
        method: "deterministic",
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

  await supabase.from("imports").update({ status: "succeeded" }).eq("id", importRow.id);
  await supabase
    .from("processing_jobs")
    .update({ status: "succeeded", stage: "validation", finished_at: new Date().toISOString() })
    .eq("import_id", importRow.id);
  await supabase.from("activity_events").insert({
    organization_id: input.organizationId,
    actor_id: profile?.id || null,
    title: `Imported ${productsTouched} products from ${input.filename}`,
  });

  return { importId: importRow.id, productsTouched, issuesCreated };
}
