import { redirect } from "next/navigation";

/** Legacy HQ path — retail fashion label intelligence (consumer domain), not /brands marketing. */
export default function HqBrandsLegacyRedirect() {
  redirect("/dashboard/retail-brands");
}
