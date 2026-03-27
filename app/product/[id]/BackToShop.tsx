"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackToShop() {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    const savedUrl = typeof window !== "undefined" ? sessionStorage.getItem("shop_return_url") : null;
    if (savedUrl) {
      router.push(savedUrl);
    } else {
      router.push("/shop");
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      data-testid="link-breadcrumb-shop"
    >
      <ChevronLeft className="w-3 h-3" />
      Shop
    </button>
  );
}
