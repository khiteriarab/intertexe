import { marketingPath } from "../../../lib/enterprise-marketing/paths";

export type StoryKind = "partner" | "client";

export type SuccessStory = {
  slug: string;
  kind: StoryKind;
  brand: string;
  headline: string;
  image: string;
  logoLabel: string;
  featured?: boolean;
  metrics: { value: string; label: string }[];
  quote: { text: string; name: string; role: string };
  challenges: string;
  solutions: string;
  keyElements: string[];
};

/** Placeholder stories for sales-page preview — replace with real case studies when ready. */
export const SUCCESS_STORIES: SuccessStory[] = [
  {
    slug: "atelier-nord-plm",
    kind: "partner",
    brand: "Atelier Nord",
    headline: "Connecting PLM product data to a governed INTERTEXE record",
    image: "/platform/demo-source.png",
    logoLabel: "Atelier Nord",
    featured: true,
    metrics: [
      { value: "6×", label: "faster product-record assembly vs. manual spreadsheets" },
      { value: "92%", label: "of sample styles mapped to a single master record" },
      { value: "100%", label: "pilot styles issued with a scannable product identity" },
    ],
    quote: {
      text: "INTERTEXE gave our product team one trusted place for composition, evidence and passport readiness — without rebuilding our PLM.",
      name: "Lena Voss",
      role: "Head of Product Systems at Atelier Nord",
    },
    challenges:
      "Atelier Nord needed to standardize composition strings, supplier evidence and style identity across PLM exports so sustainability and compliance teams could trust what they published.",
    solutions:
      "Together with INTERTEXE, the brand normalized PLM and supplier feeds into one governed product record, then prepared Digital Product Passport fields for EU-facing styles.",
    keyElements: [
      "PLM export ingestion and field mapping",
      "Composition and materials normalization",
      "Supplier evidence attachment",
      "Passport readiness scoring for sample SKUs",
    ],
  },
  {
    slug: "maison-lumen-passport",
    kind: "client",
    brand: "Maison Lumen",
    headline: "From fragmented supplier files to live Digital Product Passports",
    image: "/platform/demo-publish.png",
    logoLabel: "Maison Lumen",
    featured: true,
    metrics: [
      { value: "3.4×", label: "increase in supplier responses with structured evidence" },
      { value: "88%", label: "of priority styles reaching passport-ready status" },
      { value: "1 record", label: "powering web, QR and retail product pages" },
    ],
    quote: {
      text: "We finally have one product story that our customers, buyers and compliance team can all see — and it stays current as the record improves.",
      name: "Camille Renard",
      role: "Sustainability Lead at Maison Lumen",
    },
    challenges:
      "Supplier PDFs, retailer sheets and internal BOMs disagreed on composition and origin. Maison Lumen needed a governed path from source files to consumer-facing passports.",
    solutions:
      "INTERTEXE cleaned and connected product data, linked evidence to claims, and published passports that update from the same record used in the workspace.",
    keyElements: [
      "Source capture from PDF, XLS and ERP extracts",
      "Claim-to-evidence linking",
      "DPP readiness checks before publish",
      "QR / web passport distribution",
    ],
  },
  {
    slug: "harbor-thread-traceability",
    kind: "client",
    brand: "Harbor & Thread",
    headline: "Making supply-chain evidence visible without slowing the calendar",
    image: "/platform/demo-validate.png",
    logoLabel: "Harbor & Thread",
    metrics: [
      { value: "5 tiers", label: "of supply-chain evidence linked on priority fibers" },
      { value: "41%", label: "reduction in missing-field blockers before publish" },
      { value: "2 weeks", label: "to stand up the first governed pilot collection" },
    ],
    quote: {
      text: "Traceability stopped being a side spreadsheet. It became part of how we release a style.",
      name: "Jonah Ellis",
      role: "Operations Director at Harbor & Thread",
    },
    challenges:
      "Seasonal calendars left little time for manual evidence chasing. Teams needed missing data surfaced early — not after a style was already live.",
    solutions:
      "INTERTEXE flagged incomplete evidence and readiness gaps while product data was still being assembled, so suppliers and merchandising could close issues in parallel.",
    keyElements: [
      "Issue-driven readiness workflow",
      "Supplier evidence requests tied to claims",
      "Traceability coverage on priority materials",
      "Publish gates for incomplete records",
    ],
  },
  {
    slug: "vespera-circular",
    kind: "client",
    brand: "Vespera Studio",
    headline: "Extending the product record into repair, resale and next life",
    image: "/platform/demo-measure.png",
    logoLabel: "Vespera",
    metrics: [
      { value: "27%", label: "of passport opens continuing to care & repair content" },
      { value: "14%", label: "of scanned units exploring resale pathways" },
      { value: "1 ID", label: "kept useful beyond the first retail sale" },
    ],
    quote: {
      text: "The passport is not a PDF dump. It is how our product keeps working after it leaves the store.",
      name: "Ines Duarte",
      role: "Brand Director at Vespera Studio",
    },
    challenges:
      "Vespera wanted circular experiences without orphaning product data across consumer apps, care pages and resale partners.",
    solutions:
      "The same INTERTEXE record powers passport content, care guidance and next-life pathways — so circular programs inherit governed product intelligence.",
    keyElements: [
      "Passport content for care and repair",
      "Resale and reuse pathways on the same ID",
      "Consumer signal feedback into the record",
      "Benchmarking of engagement and readiness",
    ],
  },
  {
    slug: "linea-connect-partner",
    kind: "partner",
    brand: "Linea Connect",
    headline: "A partner integration that keeps the product record interoperable",
    image: "/platform/solutions-governed-record.png",
    logoLabel: "Linea Connect",
    metrics: [
      { value: "API-first", label: "delivery of governed product fields to partner channels" },
      { value: "0 dual entry", label: "required for synced pilot styles" },
      { value: "Shared ID", label: "across workspace, passport and partner surfaces" },
    ],
    quote: {
      text: "Our customers do not want another silo. INTERTEXE lets the product record move with the brand — into our channel and back.",
      name: "Priya Nair",
      role: "Partnerships Lead at Linea Connect",
    },
    challenges:
      "Integration partners needed a stable product identity and field contract — not bespoke spreadsheets per brand.",
    solutions:
      "Linea Connect and INTERTEXE aligned on a governed record model so partner channels can consume passport-ready product intelligence without rewriting brand data.",
    keyElements: [
      "Shared product identity contract",
      "Interoperable passport and API fields",
      "Partner channel distribution",
      "Co-sold pilot onboarding path",
    ],
  },
];

export function successStoryBySlug(slug: string): SuccessStory | undefined {
  return SUCCESS_STORIES.find((story) => story.slug === slug);
}

export function featuredSuccessStories(): SuccessStory[] {
  return SUCCESS_STORIES.filter((story) => story.featured);
}

export function gridSuccessStories(): SuccessStory[] {
  return SUCCESS_STORIES.filter((story) => !story.featured);
}

export function successStoryPath(slug: string): string {
  return `${marketingPath("success-stories")}/${slug}`;
}
