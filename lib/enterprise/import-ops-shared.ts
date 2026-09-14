/** Client-safe import ops types and constants — keep free of server-only pipeline imports. */

export const IMPORT_PIPELINE_STAGES = [
  "Uploaded",
  "Parsed",
  "Mapped",
  "Normalized",
  "Issues created",
  "Completed",
] as const;

export type ImportSummary = {
  rowsTotal?: number;
  rowsProcessed?: number;
  rowsSkipped?: number;
  productsTouched?: number;
  issuesCreated?: number;
  collisions?: number;
  sameProductUpdates?: number;
};

export function deriveImportPipelineStage(status: string, summary: ImportSummary): string {
  if (status === "failed") return "Failed";
  if (status === "processing") return "Normalized";
  if (summary.issuesCreated && summary.issuesCreated > 0) return "Issues created";
  if (summary.productsTouched && summary.productsTouched > 0) return "Completed";
  if (summary.rowsProcessed && summary.rowsProcessed > 0) return "Normalized";
  return status === "succeeded" ? "Completed" : "Uploaded";
}
