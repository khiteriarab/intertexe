/** Kill switch for batched product-table repair jobs (NFP backfill, displayable restore). */
export const CATALOG_BULK_MUTATIONS_ENV = "CATALOG_BULK_MUTATIONS_ENABLED";

export function catalogBulkMutationsEnabled(): boolean {
  return process.env[CATALOG_BULK_MUTATIONS_ENV] === "true";
}

export function catalogBulkMutationsDisabledReason(): string {
  return (
    "Catalog bulk mutations are disabled on this environment. " +
    "Set CATALOG_BULK_MUTATIONS_ENABLED=true only during a planned maintenance window."
  );
}
