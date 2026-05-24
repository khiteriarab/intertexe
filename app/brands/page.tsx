import { redirect } from "next/navigation";

/** Legacy / affiliate links → designers directory */
export default function BrandsPage() {
  redirect("/designers");
}
