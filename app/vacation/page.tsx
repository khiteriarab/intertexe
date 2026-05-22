import type { Metadata } from "next";
import Link from "next/link";
import { fetchVacationPageData } from "../../lib/supabase-server";
import VacationClient from "./VacationClient";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "The Vacation Edit — Linen Dresses & Skirts | INTERTEXE",
  description:
    "Curated vacation edit: resort-ready linen dresses and skirts verified for natural fibers. Shop the edit or browse the full linen catalog.",
  alternates: { canonical: "https://www.intertexe.com/vacation" },
};

export default async function VacationPage() {
  const data = await fetchVacationPageData({ editLimit: 32, catalogLimit: 32, category: "dresses", offset: 0 });

  return (
    <>
      <VacationClient
        initialEditProducts={data.editProducts}
        initialCatalogProducts={data.catalogProducts}
        initialCatalogTotal={data.catalogTotal}
        editCount={data.editCount}
        linenDressCount={data.linenDressCount}
        linenSkirtCount={data.linenSkirtCount}
        initialCategory="dresses"
      />
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-border/30">
        <p className="text-center text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
          This is not the main shop. The Vacation Edit is a curated slice of resort linen dresses and skirts.
          For every verified piece across all fabrics, visit{" "}
          <Link href="/shop" className="underline text-foreground">
            Shop
          </Link>
          .
        </p>
      </section>
    </>
  );
}
