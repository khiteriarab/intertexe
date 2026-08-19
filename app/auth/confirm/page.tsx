import { Suspense } from "react";
import AuthCallbackClient from "../callback/AuthCallbackClient";

export const metadata = {
  title: "Sign in | INTERTEXE",
  robots: { index: false, follow: false },
};

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
