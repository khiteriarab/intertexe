/**
 * Canonical Rakuten affiliate merchant registry (16 MIDs).
 * Used by feed sync, targeted ingest scripts, and HQ audits.
 */

/** @typedef {'marketplace' | 'mytheresa' | 'bloomingdales' | 'brand'} RakutenMerchantKind */

/** @typedef {{
 *   mid: string;
 *   label: string;
 *   kind: RakutenMerchantKind;
 *   feedSource: string;
 *   region: 'us' | 'uk' | 'eu';
 *   currency: 'USD' | 'GBP' | 'EUR' | 'CAD';
 *   retailerCountry: string;
 *   retailer?: string;
 *   brandSlug?: string;
 *   dedicatedIngest?: string;
 *   skipGenericFtp?: boolean;
 *   skipReason?: string;
 * }} RakutenMerchantDef */

/** @type {RakutenMerchantDef[]} */
export const RAKUTEN_MERCHANTS = [
  // MyTheresa (3 MIDs)
  {
    mid: '35663',
    label: 'MyTheresa EU/UK/ME',
    kind: 'mytheresa',
    feedSource: 'mytheresa',
    region: 'eu',
    currency: 'EUR',
    retailerCountry: 'DE',
    retailer: 'MyTheresa',
    dedicatedIngest: 'scripts/ingest-mytheresa-rakuten.cjs',
  },
  {
    mid: '43172',
    label: 'MyTheresa US/CA',
    kind: 'mytheresa',
    feedSource: 'mytheresa',
    region: 'us',
    currency: 'USD',
    retailerCountry: 'US',
    retailer: 'MyTheresa',
    dedicatedIngest: 'scripts/ingest-mytheresa-rakuten.cjs',
  },
  {
    mid: '43654',
    label: 'Tory Burch UK',
    kind: 'brand',
    feedSource: 'rakuten',
    region: 'uk',
    currency: 'GBP',
    retailerCountry: 'GB',
    brandSlug: 'tory-burch',
    retailer: 'Tory Burch',
    dedicatedIngest: 'scripts/ingest-tory-burch.mjs',
  },
  // Bloomingdale's (2 MIDs)
  {
    mid: '13867',
    label: "Bloomingdale's US",
    kind: 'bloomingdales',
    feedSource: 'bloomingdales',
    region: 'us',
    currency: 'USD',
    retailerCountry: 'US',
    retailer: "Bloomingdale's",
    dedicatedIngest: 'scripts/ingest-bloomingdales.mjs',
  },
  {
    mid: '37206',
    label: "Bloomingdale's UK",
    kind: 'bloomingdales',
    feedSource: 'bloomingdales',
    region: 'uk',
    currency: 'GBP',
    retailerCountry: 'GB',
    retailer: "Bloomingdale's",
    dedicatedIngest: 'scripts/ingest-bloomingdales.mjs',
  },
  // Multi-brand marketplace
  {
    mid: '50745',
    label: 'ShopSimon marketplace',
    kind: 'marketplace',
    feedSource: 'rakuten',
    region: 'us',
    currency: 'USD',
    retailerCountry: 'US',
    dedicatedIngest: 'scripts/ingest-marketplace-50745.cjs',
  },
  // Direct brand programs
  {
    mid: '49987',
    label: 'Isabel Marant',
    kind: 'brand',
    feedSource: 'rakuten',
    region: 'eu',
    currency: 'EUR',
    retailerCountry: 'FR',
    brandSlug: 'isabel-marant',
    dedicatedIngest: 'scripts/ingest-isabel-marant.mjs',
  },
  {
    mid: '50739',
    label: 'Fleur du Mal',
    kind: 'brand',
    feedSource: 'rakuten',
    region: 'us',
    currency: 'USD',
    retailerCountry: 'US',
    brandSlug: 'fleur-du-mal',
    dedicatedIngest: 'scripts/ingest-fleur-du-mal.cjs',
    skipGenericFtp: true,
    skipReason: 'Large XML feed OOMs generic runner — use dedicated script',
  },
  {
    mid: '46961',
    label: 'Faithfull the Brand',
    kind: 'brand',
    feedSource: 'rakuten',
    region: 'us',
    currency: 'USD',
    retailerCountry: 'US',
    brandSlug: 'faithfull-the-brand',
    dedicatedIngest: 'scripts/ingest-faithfull.mjs',
    skipGenericFtp: true,
    skipReason: 'No dedicated FTP MID directory — ingest via Rakuten pipe file when available',
  },
  {
    mid: '49384',
    label: 'Diesel',
    kind: 'brand',
    feedSource: 'rakuten',
    region: 'us',
    currency: 'USD',
    retailerCountry: 'US',
    brandSlug: 'diesel',
  },
  {
    mid: '41993',
    label: 'A.L.C.',
    kind: 'brand',
    feedSource: 'rakuten',
    region: 'us',
    currency: 'USD',
    retailerCountry: 'US',
    brandSlug: 'a-l-c',
  },
  {
    mid: '42841',
    label: "L'Agence",
    kind: 'brand',
    feedSource: 'rakuten',
    region: 'us',
    currency: 'USD',
    retailerCountry: 'US',
    brandSlug: 'l-agence',
    dedicatedIngest: 'scripts/ingest-lagence.cjs',
  },
  {
    mid: '42623',
    label: 'Splendid',
    kind: 'brand',
    feedSource: 'rakuten',
    region: 'us',
    currency: 'USD',
    retailerCountry: 'US',
    brandSlug: 'splendid',
    dedicatedIngest: 'scripts/ingest-splendid.cjs',
  },
  {
    mid: '36145',
    label: '7 For All Mankind',
    kind: 'brand',
    feedSource: 'rakuten',
    region: 'us',
    currency: 'USD',
    retailerCountry: 'US',
    brandSlug: '7-for-all-mankind',
    dedicatedIngest: 'scripts/ingest-7fam.cjs',
  },
  {
    mid: '52708',
    label: 'Peachy Den',
    kind: 'brand',
    feedSource: 'rakuten',
    region: 'uk',
    currency: 'GBP',
    retailerCountry: 'GB',
    brandSlug: 'peachy-den',
  },
  {
    mid: '52963',
    label: 'Veronica Beard Canada',
    kind: 'brand',
    feedSource: 'rakuten',
    region: 'us',
    currency: 'CAD',
    retailerCountry: 'CA',
    brandSlug: 'veronica-beard',
  },
];

export const RAKUTEN_MERCHANT_MIDS = RAKUTEN_MERCHANTS.map((m) => m.mid);

export const RAKUTEN_MID_CURRENCY_MAP = Object.fromEntries(
  RAKUTEN_MERCHANTS.map((m) => [
    m.mid,
    {
      currency: m.currency,
      region: m.region,
      retailerCountry: m.retailerCountry,
    },
  ])
);

export const MYTHERESA_MIDS = new Set(
  RAKUTEN_MERCHANTS.filter((m) => m.kind === 'mytheresa').map((m) => m.mid)
);

export const BLOOMINGDALES_MIDS = new Set(
  RAKUTEN_MERCHANTS.filter((m) => m.kind === 'bloomingdales').map((m) => m.mid)
);

export const GENERIC_FTP_SKIP_MIDS = new Set(
  RAKUTEN_MERCHANTS.filter((m) => m.skipGenericFtp).map((m) => m.mid)
);

export function merchantByMid(mid) {
  const id = String(mid || '').trim();
  return RAKUTEN_MERCHANTS.find((m) => m.mid === id) || null;
}

export function isTrackedRakutenMid(mid) {
  return RAKUTEN_MERCHANT_MIDS.includes(String(mid || '').trim());
}
