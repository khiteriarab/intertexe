import Image from "next/image";
import { EntPassportPill } from "./EnterpriseUi";
import { ProductLifecycleNav } from "./ProductLifecycleNav";
import type { ProductLifecycleState } from "../../../lib/enterprise/product-lifecycle";

export function ProductRecordHeader({
  name,
  imageUrl,
  productId,
  sku,
  category,
  collection,
  composition,
  passportState,
  lifecycle,
}: {
  name: string;
  imageUrl: string | null;
  productId: string;
  sku: string | null;
  category: string | null;
  collection: string | null;
  composition: string | null;
  passportState: string | null;
  lifecycle: ProductLifecycleState;
}) {
  const idLine = sku || productId;
  const summary = [collection, category, composition].filter(Boolean).join(" · ");

  return (
    <header className="ent-product-head">
      <div className="ent-product-head-media">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes="160px" className="object-cover" unoptimized />
        ) : (
          <span className="ent-product-head-fallback" aria-hidden>
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="ent-product-head-copy">
        <h1 className="ent-product-head-name">{name}</h1>
        <p className="ent-product-head-id">{idLine}</p>
        {summary ? <p className="ent-product-head-summary">{summary}</p> : null}
      </div>
      <div className="ent-product-head-meta">
        <EntPassportPill state={passportState} />
      </div>
      <div className="ent-product-head-lifecycle">
        <ProductLifecycleNav state={lifecycle} />
      </div>
    </header>
  );
}
