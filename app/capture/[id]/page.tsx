import { Suspense } from "react";
import CaptureOpenClient from "./CaptureOpenClient";

export const metadata = {
  title: "Open in INTERTEXE",
  robots: { index: false, follow: false },
};

export default async function CaptureOpenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <p>Loading…</p>
        </main>
      }
    >
      <CaptureOpenClient captureId={id} />
    </Suspense>
  );
}
