import { Suspense } from "react";
import InspirationOpenClient from "./InspirationOpenClient";

export const metadata = {
  title: "Inspiration · INTERTEXE",
  robots: { index: false, follow: false },
};

export default async function InspirationPage({
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
      <InspirationOpenClient captureId={id} />
    </Suspense>
  );
}
