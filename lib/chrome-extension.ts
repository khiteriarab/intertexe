/** Chrome Web Store listing for INTERTEXE: Fabric Scanner. */

export const CHROME_WEB_STORE_ITEM_ID = "kiifidnbenolnpcapedgjijjmedbllba";
export const CHROME_WEB_STORE_SLUG = "intertexe-fabric-scanner";

export const CHROME_WEB_STORE_DEV_CONSOLE_URL =
  "https://chrome.google.com/webstore/devconsole";

export function isChromeWebStoreItemId(id: string): boolean {
  return /^[a-z]{32}$/.test(id.trim());
}

export function chromeWebStoreDetailUrl(itemId?: string): string {
  const id = (itemId || CHROME_WEB_STORE_ITEM_ID).trim() || CHROME_WEB_STORE_ITEM_ID;
  return `https://chromewebstore.google.com/detail/${CHROME_WEB_STORE_SLUG}/${id}`;
}

export function getChromeWebStoreUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL || "").trim();
  if (/^https?:\/\//i.test(fromEnv)) return fromEnv;
  const id = (process.env.NEXT_PUBLIC_CHROME_WEB_STORE_ID || CHROME_WEB_STORE_ITEM_ID).trim();
  return chromeWebStoreDetailUrl(id);
}
