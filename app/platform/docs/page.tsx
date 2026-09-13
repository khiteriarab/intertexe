import { redirect } from "next/navigation";

/** Legacy path — nav and links use /platform/api */
export default function PlatformDocsRedirectPage() {
  redirect("/platform/api");
}
