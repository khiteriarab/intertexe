import { permanentRedirect } from "next/navigation";
import { DEFAULT_APP_STORE_URL, getAppStoreUrl } from "../../lib/app-store";

/** Legacy bookmark/share target — sends straight to the App Store. */
export default function DownloadAppRedirect() {
  permanentRedirect(getAppStoreUrl() || DEFAULT_APP_STORE_URL);
}
