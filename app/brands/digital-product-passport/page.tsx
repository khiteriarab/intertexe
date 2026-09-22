import type { Metadata } from "next";
import { redirect } from "next/navigation";

/** Canonical DPP SEO landing is /digital-product-passport. */
export const metadata: Metadata = {
  title: { absolute: "Digital Product Passport Software for Fashion | INTERTEXE" },
  alternates: { canonical: "https://www.intertexe.com/digital-product-passport" },
  robots: { index: false, follow: true },
};

export default function BrandsDigitalProductPassportRedirect() {
  redirect("/digital-product-passport");
}
