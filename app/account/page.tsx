import type { Metadata } from "next";
import { Suspense } from "react";
import AccountClient from "./AccountClient";
import { AuthConfirmBridge } from "./AuthConfirmBridge";

export const metadata: Metadata = {
  title: "Account | INTERTEXE",
  description: "Manage your INTERTEXE account, view your favorites, and access your quiz history.",
  alternates: { canonical: "https://www.intertexe.com/account" },
};

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center px-6">
          <div className="text-center">
            <p className="text-[11px] font-semibold tracking-[0.16em]">INTERTEXE</p>
            <p className="mt-3 text-sm text-muted-foreground">Loading your account…</p>
          </div>
        </main>
      }
    >
      <AuthConfirmBridge />
      <AccountClient />
    </Suspense>
  );
}
