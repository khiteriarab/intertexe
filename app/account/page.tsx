import type { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Account | INTERTEXE",
  description: "Manage your INTERTEXE account, view your favorites, and access your quiz history.",
  alternates: { canonical: "https://www.intertexe.com/account" },
};

export default function AccountPage() {
  return <AccountClient />;
}
