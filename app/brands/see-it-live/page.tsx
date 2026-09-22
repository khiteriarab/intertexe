import { redirect } from "next/navigation";
import { marketingPath } from "../../../lib/enterprise-marketing/paths";

/** Alias — “See it live” canonicalizes to /brands/demo. */
export default function BrandsSeeItLiveAlias() {
  redirect(marketingPath("demo"));
}
