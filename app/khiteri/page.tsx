import type { Metadata } from "next";
import { getKhiterisEditConfig } from "../../lib/khiteris-edit";
import { KhiterisEditView } from "./KhiterisEditView";

const edit = getKhiterisEditConfig();

export const metadata: Metadata = {
  title: `${edit.title} — ${edit.monthLabel} | INTERTEXE`,
  description:
    edit.subtitle ??
    "A curated monthly edit of natural-fiber fashion — editorial selections from INTERTEXE.",
  alternates: { canonical: "https://www.intertexe.com/khiteri" },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${edit.title} — ${edit.monthLabel}`,
    description: edit.subtitle,
    url: "https://www.intertexe.com/khiteri",
    images: edit.coverImage.src ? [{ url: edit.coverImage.src }] : undefined,
  },
};

export default function KhiteriPage() {
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL || "https://apps.apple.com";

  return <KhiterisEditView edit={edit} appStoreUrl={appStoreUrl} />;
}
