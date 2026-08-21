import type { Metadata } from "next";
import { Suspense } from "react";
import AccountClient from "../account/AccountClient";

export const metadata: Metadata = {
  title: "Sign Up | INTERTEXE",
  description: "Create an account for early access to the INTERTEXE app.",
  alternates: { canonical: "https://www.intertexe.com/signup" },
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AccountClient initialMode="signup" />
    </Suspense>
  );
}
