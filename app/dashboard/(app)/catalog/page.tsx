import { redirect } from "next/navigation";

export default function HqCatalogRedirect() {
  redirect("/dashboard/products");
}
