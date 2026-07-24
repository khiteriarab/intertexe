import type { Metadata } from "next";
import { CollectionsEditClient } from "./CollectionsEditClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop The Edit | INTERTEXE Collections",
  description:
    "Curated natural-fiber collections — Vacation, Evening, Tailoring, Summer in the City, and The White Edit.",
  alternates: { canonical: "https://www.intertexe.com/collections" },
};

export default function CollectionsPage() {
  return <CollectionsEditClient />;
}
