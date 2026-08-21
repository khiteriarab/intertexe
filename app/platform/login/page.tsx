import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Platform login",
  description: "Sign in to the INTERTEXE workspace.",
  robots: { index: false, follow: false },
};

export default function PlatformLoginPage() {
  redirect("/dashboard/login");
}
