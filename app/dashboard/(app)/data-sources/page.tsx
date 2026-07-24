import { redirect } from "next/navigation";

export default function HqLegacyRedirect() {
  redirect("/dashboard/settings");
}
