import { redirect } from "next/navigation";
import { DEFAULT_APP_STORE_URL, getAppStoreUrl } from "../../lib/app-store";

/**
 * Neutral hop to the App Store.
 * Not listed in apple-app-site-association, so Safari won't try to open the
 * native app (which caused “Action can't be completed” on /khiteri).
 */
export default function DownloadAppRedirect() {
  redirect(getAppStoreUrl() || DEFAULT_APP_STORE_URL);
}
