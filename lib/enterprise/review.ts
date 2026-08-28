import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIdentifierIssueDetail } from "./identity-reconciliation";
import { recordNormalizationCandidate } from "./learning-loop";
import { displayReviewerName } from "./reviewer-display";

async function currentProfile(client: SupabaseClient): Promise<{
  id: string | null;
  name: string;
}> {
  const { data } = await client.from("profiles").select("id, full_name, email").maybeSingle();
  return {
    id: data?.id || null,
    name: displayReviewerName({ fullName: data?.full_name, email: data?.email }),
  };
}

export async function resolveIssue(input: {
  client: SupabaseClient;
  organizationId: string;
  issueId: string;
  status: "resolved" | "rejected" | "not_applicable";
}) {
  const supabase = input.client;
  const { data: issue } = await supabase
    .from("issues")
    .select("id, product_id, issue_type, title, original_value, interpreted_value, detail")
    .eq("organization_id", input.organizationId)
    .eq("id", input.issueId)
    .maybeSingle();
  if (!issue) throw new Error("Issue not found.");
  if (issue.issue_type === "identifier" && parseIdentifierIssueDetail(issue.detail)) {
    throw new Error("Identifier collisions need Confirm same product, Treat as separate, or Correct identifier.");
  }
  const { error } = await supabase
    .from("issues")
    .update({ status: input.status })
    .eq("id", input.issueId)
    .eq("organization_id", input.organizationId);
  if (error) throw new Error(error.message);
  const profile = await currentProfile(supabase);
  const profileId = profile.id;

  if (
    input.status === "resolved" &&
    issue.issue_type === "conflict" &&
    issue.original_value &&
    issue.interpreted_value
  ) {
    const fieldKey =
      String(issue.title || "").match(/^Locked (\S+) differs from new source$/)?.[1] || "composition";
    await recordNormalizationCandidate({
      client: supabase,
      organizationId: input.organizationId,
      fieldKey,
      original: String(issue.original_value),
      canonical: String(issue.interpreted_value),
      issueId: issue.id,
      productId: issue.product_id,
      reviewerId: profileId,
      source: "issue_resolution",
      status: "candidate",
    });
  }

  if (
    input.status === "resolved" &&
    issue.issue_type === "conflict" &&
    issue.product_id &&
    issue.interpreted_value
  ) {
    const fieldKey = String(issue.title || "").match(/^Locked (\S+) differs from new source$/)?.[1];
    if (fieldKey) {
      const patched = await supabase
        .from("normalized_fields")
        .update({
          normalized_value: issue.interpreted_value,
          state: "unverified",
          locked: false,
          reviewer_id: null,
          explanation:
            "Incoming source accepted after conflict review. Re-approval is required before publish.",
          intelligence_kind: "override",
        })
        .eq("organization_id", input.organizationId)
        .eq("product_id", issue.product_id)
        .eq("field_key", fieldKey);
      if (patched.error) {
        await supabase
          .from("normalized_fields")
          .update({
            normalized_value: issue.interpreted_value,
            state: "unverified",
            locked: false,
            reviewer_id: null,
            explanation:
              "Incoming source accepted after conflict review. Re-approval is required before publish.",
          })
          .eq("organization_id", input.organizationId)
          .eq("product_id", issue.product_id)
          .eq("field_key", fieldKey);
      }
      await supabase
        .from("products")
        .update({ passport_state: "review_required" })
        .eq("id", issue.product_id)
        .eq("organization_id", input.organizationId);
    }
  }

  await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_id: profileId,
    action: `issue_${input.status}`,
    object_type: "issue",
    object_id: input.issueId,
    previous_ref: "open",
    resulting_ref: input.status,
  });
  await supabase.from("activity_events").insert({
    organization_id: input.organizationId,
    actor_id: profileId,
    title: `Issue ${input.status.replaceAll("_", " ")}: ${issue.title}`,
    detail: `product:${issue.product_id || ""} | reviewer:${profile.name}`,
  });
}

export async function approveProductFields(input: {
  client: SupabaseClient;
  organizationId: string;
  productId: string;
  reason: string;
}) {
  const reason = input.reason.trim();
  if (reason.length < 8) throw new Error("A review reason is required.");

  const supabase = input.client;
  const profile = await currentProfile(supabase);
  const profileId = profile.id;
  const { data: before } = await supabase
    .from("normalized_fields")
    .select("field_key, original_value, normalized_value, state, locked")
    .eq("organization_id", input.organizationId)
    .eq("product_id", input.productId)
    .in("field_key", ["name", "composition", "manufacturing_country"]);

  const { error } = await supabase
    .from("normalized_fields")
    .update({
      state: "approved",
      locked: true,
      reviewer_id: profileId,
    })
    .eq("organization_id", input.organizationId)
    .eq("product_id", input.productId)
    .in("field_key", ["name", "composition", "manufacturing_country"]);
  if (error) throw new Error(error.message);

  for (const row of before || []) {
    if (row.field_key === "name") continue;
    if (row.original_value && row.normalized_value) {
      await recordNormalizationCandidate({
        client: supabase,
        organizationId: input.organizationId,
        fieldKey: String(row.field_key),
        original: String(row.original_value),
        canonical: String(row.normalized_value),
        productId: input.productId,
        reviewerId: profileId,
        source: "field_approval",
        status: "candidate",
      });
    }
  }

  const { count: blocking } = await supabase
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("product_id", input.productId)
    .eq("status", "open")
    .in("severity", ["critical", "high"]);

  await supabase
    .from("products")
    .update({ passport_state: blocking ? "review_required" : "ready" })
    .eq("id", input.productId)
    .eq("organization_id", input.organizationId);

  const beforeSummary = (before || [])
    .map((row) => `${row.field_key}:${row.state}:${row.normalized_value || ""}`)
    .join(" | ");
  const afterSummary = (before || [])
    .map((row) => `${row.field_key}:approved:${row.normalized_value || ""}`)
    .join(" | ");

  await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_id: profileId,
    action: "fields_approved",
    object_type: "product",
    object_id: input.productId,
    previous_ref: beforeSummary.slice(0, 500) || null,
    resulting_ref: afterSummary.slice(0, 500) || "approved",
    request_meta: {
      reason,
      before: before || [],
      after_state: "approved",
    },
  });
  await supabase.from("activity_events").insert({
    organization_id: input.organizationId,
    actor_id: profileId,
    title: `Approved identity and composition`,
    detail: `product:${input.productId} | reviewer:${profile.name} | reason: ${reason}`,
  });
}

export type IdentifierDecisionAction =
  | "confirm_same_product"
  | "treat_as_separate"
  | "correct_identifier";

export async function applyIdentifierDecision(input: {
  client: SupabaseClient;
  organizationId: string;
  issueId: string;
  action: IdentifierDecisionAction;
  correctedIdentifier?: string;
}) {
  const supabase = input.client;
  const profile = await currentProfile(supabase);
  const { data: issue } = await supabase
    .from("issues")
    .select("id, product_id, issue_type, title, status, detail, original_value")
    .eq("organization_id", input.organizationId)
    .eq("id", input.issueId)
    .maybeSingle();
  if (!issue) throw new Error("Issue not found.");
  if (issue.status !== "open") throw new Error("This issue is already closed.");
  if (issue.issue_type !== "identifier") {
    throw new Error("Use resolve, reject, or not applicable for this issue.");
  }
  const detail = parseIdentifierIssueDetail(issue.detail);
  if (!detail) {
    throw new Error("This identifier issue has no reconciliation record. Resolve it after correcting the source file.");
  }

  const { data: membership } = profile.id
    ? await supabase
        .from("organization_memberships")
        .select("role")
        .eq("organization_id", input.organizationId)
        .eq("user_id", profile.id)
        .eq("status", "active")
        .maybeSingle()
    : { data: null };

  if (input.action === "confirm_same_product") {
    const keepId = detail.matchedProductId;
    const dropId = issue.product_id;
    if (!keepId || !dropId || keepId === dropId) {
      throw new Error("Cannot confirm the same product: the matched catalog record is missing.");
    }
    const now = new Date().toISOString();
    const archived = await supabase
      .from("products")
      .update({ lifecycle: "archived", last_updated_at: now })
      .eq("id", dropId)
      .eq("organization_id", input.organizationId);
    if (archived.error) throw new Error(archived.error.message);
    const incomingSku = String(detail.incoming.sku || "").trim();
    if (incomingSku) {
      await supabase.from("variants").upsert(
        {
          organization_id: input.organizationId,
          product_id: keepId,
          name: detail.incoming.variant || detail.incoming.name || null,
          sku: incomingSku,
          gtin: null,
        },
        { onConflict: "organization_id,product_id,sku" }
      );
    }
  }

  if (input.action === "correct_identifier") {
    const value = String(input.correctedIdentifier || "").trim();
    if (!value) throw new Error("Enter the corrected identifier.");
    if (!issue.product_id) throw new Error("This issue is not attached to a product.");
    const identifierType =
      detail.matchOn === "sku" ? "sku" : detail.matchOn === "style" ? "style" : "gtin";
    const inserted = await supabase.from("product_identifiers").insert({
      organization_id: input.organizationId,
      product_id: issue.product_id,
      identifier_type: identifierType,
      identifier_value: value,
      issuing_system: "operator_correction",
    });
    if (inserted.error) {
      const duplicate =
        inserted.error.code === "23505" || /duplicate|unique/i.test(inserted.error.message);
      throw new Error(
        duplicate
          ? "That identifier is already used by another product in this organization."
          : inserted.error.message
      );
    }
  }

  const resolution = {
    action: input.action,
    actorId: profile.id,
    actorName: profile.name,
    actorRole: membership?.role || null,
    at: new Date().toISOString(),
    correctedIdentifier: input.action === "correct_identifier" ? String(input.correctedIdentifier || "").trim() : undefined,
  };
  const nextDetail = { ...detail, resolution };
  const updated = await supabase
    .from("issues")
    .update({
      status: "resolved",
      detail: JSON.stringify(nextDetail),
      assignee_id: profile.id,
    })
    .eq("id", input.issueId)
    .eq("organization_id", input.organizationId);
  if (updated.error) throw new Error(updated.error.message);

  const actionLabel =
    input.action === "confirm_same_product"
      ? "Confirmed same product"
      : input.action === "treat_as_separate"
        ? "Treated as separate product"
        : "Corrected identifier";

  await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_id: profile.id,
    action: `identifier_${input.action}`,
    object_type: "issue",
    object_id: input.issueId,
    previous_ref: "open",
    resulting_ref: input.action,
    request_meta: {
      classification: detail.classification,
      matchOn: detail.matchOn,
      identifierValue: detail.identifierValue,
      matchedProductId: detail.matchedProductId,
      productId: issue.product_id,
      correctedIdentifier: resolution.correctedIdentifier || null,
      actorName: profile.name,
      actorRole: membership?.role || null,
    },
  });
  await supabase.from("activity_events").insert({
    organization_id: input.organizationId,
    actor_id: profile.id,
    title: `${actionLabel}: ${issue.title}`,
    detail: `product:${issue.product_id || ""} | reviewer:${profile.name} | action:${input.action}`,
  });
}
