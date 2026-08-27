/** Chrome Web Store listing for INTERTEXE: Fabric Scanner. */

export const CHROME_WEB_STORE_ITEM_ID = "kiifidnbenolnpcapedgjijjmedbllba";
export const CHROME_WEB_STORE_SLUG = "intertexe-fabric-scanner";

export function getChromeWebStoreUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL || "").trim();
  if (/^https?:\/\//i.test(fromEnv)) return fromEnv;
  const id = (process.env.NEXT_PUBLIC_CHROME_WEB_STORE_ID || CHROME_WEB_STORE_ITEM_ID).trim();
  return `https://chromewebstore.google.com/detail/${CHROME_WEB_STORE_SLUG}/${id}`;
}
