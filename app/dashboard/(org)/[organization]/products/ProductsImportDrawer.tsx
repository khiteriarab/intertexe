"use client";

import { useEffect, useState } from "react";
import { EntDrawer } from "../../../components/EntDrawer";
import { entButtonClass } from "../../../components/EnterpriseUi";
import { CatalogImportClient } from "./CatalogImportClient";

export function ProductsImportDrawer({
  slug,
  canMutate,
  autoOpen = false,
}: {
  slug: string;
  canMutate: boolean;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  if (!canMutate) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={entButtonClass}>
        + Import products
      </button>
      <EntDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="Import catalog"
        subtitle="Map columns, preview identifier matches, then confirm. Colliding GTINs stay separate."
        width="wide"
      >
        <CatalogImportClient slug={slug} canMutate={canMutate} />
      </EntDrawer>
    </>
  );
}
