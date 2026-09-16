"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PRODUCT_RECORD_TABS, resolveProductRecordTab, type ProductRecordTab } from "../../../lib/enterprise/product-record-tabs";

export type { ProductRecordTab };

export function ProductRecordNav({ basePath }: { basePath: string }) {
  const searchParams = useSearchParams();
  const active = resolveProductRecordTab(searchParams.get("tab"));

  return (
    <nav className="ent-product-tabs" aria-label="Product record sections">
      {PRODUCT_RECORD_TABS.map((tab) => {
        const href = tab.id === "overview" ? basePath : `${basePath}?tab=${tab.id}`;
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            className={`ent-product-tab ${isActive ? "is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
