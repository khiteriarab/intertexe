"use client";

import dynamic from "next/dynamic";

const ShopClient = dynamic(
  () => import("./ShopClient"),
  { ssr: false }
);

export default function ShopWrapper() {
  return (
    <ShopClient
      initialProducts={[]}
      initialTotal={0}
      totalProductCount={0}
      fiberCounts={{}}
    />
  );
}
