"use client";

import { Suspense } from "react";
import { ProductRecordNav } from "./ProductRecordNav";

export function ProductRecordShell({ basePath, children }: { basePath: string; children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="ent-product-tabs ent-product-tabs--loading">Loading sections…</div>}>
        <ProductRecordNav basePath={basePath} />
      </Suspense>
      {children}
    </>
  );
}
