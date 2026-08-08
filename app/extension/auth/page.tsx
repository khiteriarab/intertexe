import { Suspense } from "react";
import ExtensionAuthClient from "./ExtensionAuthClient";

export const metadata = {
  title: "Sign in · INTERTEXE extension",
  robots: { index: false, follow: false },
};

export default function ExtensionAuthPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <p>Loading…</p>
        </main>
      }
    >
      <ExtensionAuthClient />
    </Suspense>
  );
}
