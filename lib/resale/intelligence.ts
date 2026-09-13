import type { ConsumerPassportContent } from "../enterprise/public-passport-content";
import type { ResaleValuation } from "./types";
import { estimateResaleValue } from "./valuation";

function parseRetail(fields: ConsumerPassportContent["publicFields"]): number | null {
  const row = fields?.find((f) => /original_retail|msrp|retail_price/i.test(f.key));
  if (!row?.value) return null;
  const n = Number(String(row.value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Resale intelligence surfaced on passport and in brand API responses. */
export function buildResaleIntelligence(consumer: ConsumerPassportContent): ResaleValuation {
  return estimateResaleValue({
    brand: consumer.brand,
    category: consumer.category,
    composition: consumer.composition,
    originalRetail: parseRetail(consumer.publicFields),
    ageMonths: 12,
    currency: "USD",
  });
}
