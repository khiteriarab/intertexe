import type { Metadata } from "next";
import { headers } from "next/headers";
import { getKhiterisEditConfig } from "../../lib/khiteris-edit";
import { catalogRegionFromCountry, getCountryFromHeaders } from "../../lib/geo-detect";
import { resolveKhiterisEditForRegion } from "../../lib/khiteri-regional-links";
import { KhiterisEditView } from "./KhiterisEditView";

const baseEdit = getKhiterisEditConfig();

export const metadata: Metadata = {
  title: `${baseEdit.title} — ${baseEdit.monthLabel} | INTERTEXE`,
  description:
    baseEdit.subtitle ??
    "A curated monthly edit of natural-fiber fashion — editorial selections from INTERTEXE.",
  alternates: { canonical: "https://www.intertexe.com/khiteri" },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${baseEdit.title} — ${baseEdit.monthLabel}`,
    description: baseEdit.subtitle,
    url: "https://www.intertexe.com/khiteri",
    images: baseEdit.coverImage.src ? [{ url: baseEdit.coverImage.src }] : undefined,
  },
};

export default async function KhiteriPage() {
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL || "https://apps.apple.com";
  const country = getCountryFromHeaders(await headers());
  const catalogRegion = catalogRegionFromCountry(country);
  const edit = await resolveKhiterisEditForRegion(baseEdit, catalogRegion);

  return <KhiterisEditView edit={edit} appStoreUrl={appStoreUrl} catalogRegion={catalogRegion} />;
}
