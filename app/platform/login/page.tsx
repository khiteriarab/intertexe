import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEnterpriseLoginUrl } from "../../../lib/platform-urls";

export const metadata: Metadata = {
  title: "Sign in · INTERTEXE",
  description: "Sign in to your INTERTEXE organization workspace.",
};

/** Legacy alias — enterprise login lives on platform.intertexe.com */
export default function PlatformLoginPage() {
  redirect(getEnterpriseLoginUrl());
}
