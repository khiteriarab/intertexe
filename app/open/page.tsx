import type { Metadata } from "next";
import { Suspense } from "react";
import OpenAppClient from "./OpenAppClient";

export const metadata: Metadata = {
  title: "Open INTERTEXE",
  robots: { index: false, follow: false },
};

export default function OpenAppPage() {
  return (
    <Suspense fallback={null}>
      <OpenAppClient />
    </Suspense>
  );
}
