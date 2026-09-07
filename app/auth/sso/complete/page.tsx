import { Suspense } from "react";
import SsoCompleteInner from "./SsoCompleteInner";

export default function SsoCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Completing sign-in…</div>}>
      <SsoCompleteInner />
    </Suspense>
  );
}
