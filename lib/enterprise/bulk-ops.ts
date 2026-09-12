import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupplierEvidenceRequest } from "./supplier-evidence";
import { approveProductFields, resolveIssue } from "./review";

export type BulkIssueAction = "resolve" | "reject" | "not_applicable";
export type BulkProductAction = "approve_fields" | "archive";

export async function bulkResolveIssues(input: {
  client: SupabaseClient;
  organizationId: string;
  issueIds: string[];
  action: BulkIssueAction;
}): Promise<{ ok: number; failed: number; errors: string[] }> {
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const issueId of input.issueIds) {
    try {
      await resolveIssue({
        client: input.client,
        organizationId: input.organizationId,
        issueId,
        status: input.action === "resolve" ? "resolved" : input.action === "reject" ? "rejected" : "not_applicable",
      });
      ok += 1;
    } catch (e) {
      failed += 1;
      errors.push(`${issueId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { ok, failed, errors };
}

export async function bulkApproveProductFields(input: {
  client: SupabaseClient;
  organizationId: string;
  productIds: string[];
  reason?: string;
}): Promise<{ ok: number; failed: number; errors: string[] }> {
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const productId of input.productIds) {
    try {
      await approveProductFields({
        client: input.client,
        organizationId: input.organizationId,
        productId,
        reason: input.reason || "Bulk approval",
      });
      ok += 1;
    } catch (e) {
      failed += 1;
      errors.push(`${productId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { ok, failed, errors };
}

export async function bulkArchiveProducts(input: {
  client: SupabaseClient;
  organizationId: string;
  productIds: string[];
}): Promise<{ ok: number; failed: number }> {
  const { data, error } = await input.client
    .from("products")
    .update({ lifecycle: "archived", last_updated_at: new Date().toISOString() })
    .eq("organization_id", input.organizationId)
    .in("id", input.productIds)
    .select("id");
  if (error) throw new Error(error.message);
  return { ok: data?.length || 0, failed: input.productIds.length - (data?.length || 0) };
}

export async function bulkRequestSupplierEvidence(input: {
  client: SupabaseClient;
  organizationId: string;
  issueIds: string[];
  requesterId: string | null;
  supplierName: string;
  supplierEmail?: string;
  dueAt?: string;
}): Promise<{ ok: number; failed: number; errors: string[] }> {
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const issueId of input.issueIds) {
    try {
      await createSupplierEvidenceRequest({
        client: input.client,
        organizationId: input.organizationId,
        issueId,
        requesterId: input.requesterId,
        supplierName: input.supplierName,
        supplierEmail: input.supplierEmail,
        dueAt: input.dueAt,
      });
      ok += 1;
    } catch (e) {
      failed += 1;
      errors.push(`${issueId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { ok, failed, errors };
}
