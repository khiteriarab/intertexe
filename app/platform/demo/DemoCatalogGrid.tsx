"use client";

import { useState } from "react";
import {
  DEMO_CATALOG,
  DEMO_CATALOG_NOTICE,
  DEMO_ISSUE_LABEL,
  type DemoCatalogProduct,
} from "../../../lib/material-intelligence/demo-catalog";
import { DEMO_FEATURED } from "../../../lib/material-intelligence/demo-featured";
import { Frame, SERIF } from "../platform-ui";

function passportLabel(status: DemoCatalogProduct["passport"]["status"]) {
  if (status === "ready") return "Passport ready";
  if (status === "review") return "Review required";
  return "Needs data";
}

function ProductCard({
  product,
  onViewRaw,
}: {
  product: DemoCatalogProduct;
  onViewRaw: () => void;
}) {
  const featured = product.id === DEMO_FEATURED.id;
  const image = product.silk ? DEMO_FEATURED.image : undefined;

  return (
    <article className={`demo-tour-product-card ${featured ? "ring-2 ring-[var(--platform-accent)]/40" : ""}`}>
      {image ? (
        <img src={image} alt={product.name} width={320} height={400} className="demo-tour-product-image" />
      ) : (
        <div className="demo-tour-product-image flex items-end p-4 bg-gradient-to-br from-[#f0ebe4] to-[#e8e3da]">
          <span className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">{product.category}</span>
        </div>
      )}
      <div className="p-4">
        {featured ? (
          <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-accent)] mb-1">Featured example</p>
        ) : null}
        <h3 className="text-base text-[var(--platform-ink)] mb-1" style={SERIF}>
          {product.name}
        </h3>
        <p className="text-xs text-[var(--platform-muted)] mb-3">{product.normalized.shell}</p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] mb-4">
          <div>
            <dt className="text-[var(--platform-quiet)] uppercase tracking-[0.08em]">Readiness</dt>
            <dd className="text-[var(--platform-ink)]">{passportLabel(product.passport.status)}</dd>
          </div>
          <div>
            <dt className="text-[var(--platform-quiet)] uppercase tracking-[0.08em]">Issues</dt>
            <dd className="text-[var(--platform-ink)]">{product.issues.length || "None"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[var(--platform-quiet)] uppercase tracking-[0.08em]">Passport</dt>
            <dd className="text-[var(--platform-ink)] capitalize">{product.passport.status.replace("_", " ")}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onViewRaw}
          className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-primary)] underline underline-offset-4"
        >
          View source data
        </button>
      </div>
    </article>
  );
}

function SourcePanel({ product }: { product: DemoCatalogProduct }) {
  return (
    <>
      <p className="text-[10px] tracking-[0.16em] uppercase text-[#8a847c] mb-3">Submitted · {product.sku}</p>
      <p className="text-lg mb-3" style={SERIF}>
        {product.name}
      </p>
      <p className="font-mono text-[13px] mb-2">{product.source.main}</p>
      {product.source.lining ? <p className="font-mono text-[13px] mb-2">Lining: {product.source.lining}</p> : null}
      <p className="text-sm text-[#5c5854] mb-2">Supplier: {product.source.supplier || "blank"}</p>
      <p className="text-sm text-[#5c5854] mb-2">Origin: {product.source.origin || "blank"}</p>
      <p className="text-sm text-[#5c5854] mb-4">Identifier: {product.source.identifier || "blank"}</p>
      <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-primary)] mb-2">Normalized</p>
      <p className="text-sm mb-2">{product.normalized.shell}</p>
      {product.issues.length ? (
        <ul className="text-xs text-[#8a847c] space-y-1 mt-4">
          {product.issues.map((issue) => (
            <li key={issue}>{DEMO_ISSUE_LABEL[issue]}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function DemoCatalogGrid() {
  const [rawProductId, setRawProductId] = useState<string | null>(null);
  const rawProduct = DEMO_CATALOG.find((p) => p.id === rawProductId);

  return (
    <section id="catalog" className="scroll-mt-28 mb-16 sm:mb-24">
      <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">Sample catalog</p>
      <h2 className="text-[1.75rem] sm:text-3xl font-light mb-4 max-w-2xl leading-[1.15]" style={SERIF}>
        Ten INTERTEXE sample products.
      </h2>
      <p className="text-[15px] text-[var(--platform-muted)] font-light max-w-2xl mb-2">
        Product cards first — source strings, readiness, and passport status at a glance. Technical detail stays one click away.
      </p>
      <p className="text-sm text-[var(--platform-quiet)] max-w-2xl mb-10">{DEMO_CATALOG_NOTICE}</p>

      <div className="demo-tour-catalog-grid mb-10">
        {DEMO_CATALOG.map((product) => (
          <ProductCard key={product.id} product={product} onViewRaw={() => setRawProductId(product.id)} />
        ))}
      </div>

      {rawProduct ? (
        <div className="max-w-2xl">
          <Frame label={`Source data · ${rawProduct.sku}`}>
            <SourcePanel product={rawProduct} />
            <button
              type="button"
              onClick={() => setRawProductId(null)}
              className="mt-6 text-[10px] tracking-[0.12em] uppercase text-[var(--platform-quiet)]"
            >
              Close
            </button>
          </Frame>
        </div>
      ) : null}
    </section>
  );
}
