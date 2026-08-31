/** Shared guard for ops scripts that mass-touch public.products. */
export function assertCatalogBulkMutationsAllowed() {
  if (process.env.CATALOG_BULK_MUTATIONS_ENABLED === "true") return;
  console.error(
    "Refusing to run: catalog bulk mutations are disabled.\n" +
      "Set CATALOG_BULK_MUTATIONS_ENABLED=true only during a planned maintenance window."
  );
  process.exit(1);
}
