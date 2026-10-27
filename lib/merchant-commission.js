/**
 * Affiliate commission rates by Rakuten MID / merchant kind.
 * Keep in sync with lib/merchant-commission.ts.
 */

export const COMMISSION_PERCENT_BY_KIND = {
  brand: 10,
  mytheresa: 5,
  bloomingdales: 2.5,
  marketplace: 1.5,
};

/** Explicit MID rates when known from the publisher dashboard. */
export const COMMISSION_PERCENT_BY_MID = {
  // "39906": 12,
  // "43172": 5,
};

const KIND_BY_MID = {
  "35663": "mytheresa",
  "43172": "mytheresa",
  "13867": "bloomingdales",
  "37206": "bloomingdales",
  "50745": "marketplace",
  "49987": "brand",
  "50739": "brand",
  "46961": "brand",
  "49384": "brand",
  "41993": "brand",
  "42841": "brand",
  "42623": "brand",
  "36145": "brand",
  "52708": "brand",
  "52963": "brand",
  "39906": "brand",
  "43654": "brand",
};

export function merchantKindForMid(mid) {
  const id = String(mid || "").trim();
  if (!id) return null;
  return KIND_BY_MID[id] ?? null;
}

export function commissionPercentForMid(mid) {
  const id = String(mid || "").trim();
  if (!id) return 0;
  if (Object.prototype.hasOwnProperty.call(COMMISSION_PERCENT_BY_MID, id)) {
    return Number(COMMISSION_PERCENT_BY_MID[id]) || 0;
  }
  const kind = KIND_BY_MID[id];
  if (kind) return COMMISSION_PERCENT_BY_KIND[kind];
  return 0;
}

export function commissionPercentForRow(row) {
  return commissionPercentForMid(row?.retailer_mid ?? row?.retailerMid);
}
