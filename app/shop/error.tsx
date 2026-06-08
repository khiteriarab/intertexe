"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShopError() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto px-8 py-16 text-center">
      <p className="text-xs tracking-[0.3em] text-gray-400 uppercase">Loading...</p>
    </div>
  );
}
