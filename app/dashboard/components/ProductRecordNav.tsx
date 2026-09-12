"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "materials", label: "Materials" },
  { id: "traceability", label: "Traceability" },
  { id: "suppliers", label: "Suppliers & evidence" },
  { id: "impact", label: "Impact" },
  { id: "passport", label: "Passport" },
  { id: "history", label: "History" },
] as const;

export type ProductRecordTab = (typeof TABS)[number]["id"];

export function ProductRecordNav({ basePath }: { basePath: string }) {
  const searchParams = useSearchParams();
  const active = (searchParams.get("tab") as ProductRecordTab) || "overview";

  return (
    <nav className="ent-product-tabs" aria-label="Product record sections">
      {TABS.map((tab) => {
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
