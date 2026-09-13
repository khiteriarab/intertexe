import type { ConsumerPassportContent } from "../enterprise/public-passport-content";
import type { ResaleListingDraft } from "./types";

export function buildListingDraftFromPassport(input: {
  consumer: ConsumerPassportContent;
  publicId: string;
  conditionGrade: string;
  conditionNotes?: string;
  flaws?: string;
  askingPrice: number;
  currency?: string;
  consumerPhotos: string[];
  size?: string | null;
}): ResaleListingDraft {
  const { consumer } = input;
  const title = `${consumer.brand ? `${consumer.brand} ` : ""}${consumer.productName}`.slice(0, 80);
  const lines = [
    title,
    "Authenticity verified through INTERTEXE Digital Product Passport.",
    consumer.composition ? `Composition: ${consumer.composition}` : null,
    consumer.manufacturingCountry ? `Made in ${consumer.manufacturingCountry}` : null,
    input.conditionGrade ? `Condition: ${input.conditionGrade}` : null,
    input.conditionNotes,
    input.flaws ? `Notes: ${input.flaws}` : null,
    consumer.identifier ? `Product ID: ${consumer.identifier}` : null,
  ].filter(Boolean);

  return {
    title,
    description: lines.join("\n"),
    brand: consumer.brand,
    category: consumer.category,
    composition: consumer.composition,
    condition: input.conditionGrade,
    conditionNotes: input.conditionNotes,
    flaws: input.flaws,
    color: consumer.color,
    size: input.size ?? null,
    askingPrice: input.askingPrice,
    currency: input.currency || "USD",
    consumerPhotos: input.consumerPhotos,
    productIdentity: consumer.identifier || input.publicId,
    publicId: input.publicId,
  };
}
