import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import OpenAppClient from "./OpenAppClient";
import { shouldSkipAppOpenLanding, webPathFromOpenNext } from "../../lib/app-open-landing";

export const metadata: Metadata = {
  title: "Open INTERTEXE",
  robots: { index: false, follow: false },
};

export default async function OpenAppPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; itx_cta?: string }>;
}) {
  const params = await searchParams;
  const ua = (await headers()).get("user-agent") || "";
  if (
    shouldSkipAppOpenLanding({
      userAgent: ua,
      next: params.next,
      cta: params.itx_cta,
    })
  ) {
    redirect(webPathFromOpenNext(params.next));
  }
  return (
    <Suspense fallback={null}>
      <OpenAppClient />
    </Suspense>
  );
}
