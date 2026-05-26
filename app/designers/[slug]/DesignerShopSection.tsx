"use client";

import { useState } from "react";
import { BrandEditorialSections } from "./BrandEditorialSections";
import { DesignerDetailProducts } from "./DesignerDetailProducts";

type ProductItem = {
  id: string;
  name: string;
  productId: string;
  url: string;
  imageUrl: string;
  price: string;
  composition: string;
  naturalFiberPercent: number;
  category: string;
  [key: string]: unknown;
};

export function DesignerShopSection({
  products,
  designerName,
  designerSlug,
  designerWebsite,
  description,
  naturalFiberPercent,
  hasProfile,
  profileMaterialStrengths,
  initialHasMore,
}: {
  products: ProductItem[];
  designerName: string;
  designerSlug: string;
  designerWebsite: string | null;
  description: string | null;
  naturalFiberPercent: number | null;
  hasProfile: boolean;
  profileMaterialStrengths: string[];
  initialHasMore: boolean;
}) {
  const [fiberFilter, setFiberFilter] = useState<string | null>(null);

  return (
    <>
      <BrandEditorialSections
        description={description}
        naturalFiberPercent={naturalFiberPercent}
        products={products}
        onFiberFilter={setFiberFilter}
      />
      <DesignerDetailProducts
        products={products}
        designerName={designerName}
        designerSlug={designerSlug}
        designerWebsite={designerWebsite}
        hasProfile={hasProfile}
        profileMaterialStrengths={profileMaterialStrengths}
        initialHasMore={initialHasMore}
        shopMode
        fiberFilter={fiberFilter}
      />
    </>
  );
}
