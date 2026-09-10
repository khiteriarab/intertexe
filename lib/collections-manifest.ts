import { COLLECTION_PAGES, COLLECTION_SLUGS, type CollectionSlug } from "./collection-pages";
import { COLLECTION_SECTIONS } from "./site-architecture";

/** Seasonal menu layout — change hero/grid here without an app release. */
export const COLLECTIONS_MENU = {
  heroSlug: "fall-edit" as CollectionSlug,
  gridSlugs: ["vacation", "evening", "tailoring", "white-edit"] as const,
};

const MENU_LABELS: Record<CollectionSlug, string> = {
  vacation: "Vacation Shop",
  evening: "Evening",
  tailoring: "Tailoring",
  "fall-edit": "The Fall Edit",
  "white-edit": "The White Edit",
};

const GRID_SUBLINES: Record<CollectionSlug, string> = {
  vacation: "Linen & silk.",
  evening: "After dark.",
  tailoring: "Outlast every trend.",
  "fall-edit": "Cashmere & suede.",
  "white-edit": "Ivory. Chalk. Cream.",
};

const EDITORIAL_INTROS: Record<CollectionSlug, string> = {
  vacation:
    "The pieces you reach for when the light changes. Every garment in this edit has been independently verified for natural fiber content — because what you wear on holiday should feel as good as it looks.",
  evening:
    "Silk that drapes. Wool crêpe that holds its shape through the night. This edit is built for the moments that matter — each piece verified to contain at least 80% natural fiber.",
  tailoring:
    "A blazer that fits perfectly lasts a decade. These are the structured pieces worth investing in — natural fiber construction that holds its form, season after season.",
  "fall-edit":
    "September is the shift — lighter days, cooler evenings. Cashmere that layers without bulk. Suede with texture and weight. This edit is transitional luxury for the season change — every piece verified for natural fiber content.",
  "white-edit":
    "White is not a single color. It is ivory silk, chalk linen, cream cashmere. This edit collects the full spectrum of natural white — every piece independently verified.",
};

const IMAGE_CROP: Record<CollectionSlug, "top" | "center"> = {
  vacation: "top",
  tailoring: "top",
  "white-edit": "top",
  evening: "top",
  "fall-edit": "top",
};

const CAPTION_PLACEMENT: Record<CollectionSlug, "below" | "overlay"> = {
  evening: "overlay",
  "fall-edit": "overlay",
  vacation: "overlay",
  tailoring: "overlay",
  "white-edit": "overlay",
};

const HOMEPAGE_TITLES: Record<CollectionSlug, string> = {
  vacation: "VACATION",
  evening: "EVENING",
  tailoring: "TAILORING",
  "fall-edit": "THE FALL EDIT",
  "white-edit": "THE WHITE EDIT",
};

const HOMEPAGE_SUBTITLES: Record<CollectionSlug, string> = {
  vacation: "The vacation edit",
  evening: "The evening edit",
  tailoring: "The tailoring edit",
  "fall-edit": "The fall edit",
  "white-edit": "Monochrome natural fibers",
};

export type CollectionManifestItem = {
  slug: CollectionSlug;
  title: string;
  menuLabel: string;
  kicker: string;
  subline: string;
  gridSubline: string;
  editorialIntro: string;
  railKey: string;
  imageCrop: "top" | "center";
  captionPlacement: "below" | "overlay";
  homepageTitle: string;
  homepageSubtitle: string;
};

export type CollectionsManifest = {
  version: number;
  updatedAt: string;
  menu: {
    heroSlug: CollectionSlug;
    gridSlugs: readonly CollectionSlug[];
  };
  carouselSlugs: CollectionSlug[];
  homepageSlugs: CollectionSlug[];
  items: CollectionManifestItem[];
};

function manifestItemForSlug(slug: CollectionSlug): CollectionManifestItem {
  const page = COLLECTION_PAGES[slug];
  const section = COLLECTION_SECTIONS.find((c) => c.slug === slug);

  return {
    slug,
    title: page.title,
    menuLabel: MENU_LABELS[slug],
    kicker: page.kicker,
    subline: page.description,
    gridSubline: GRID_SUBLINES[slug],
    editorialIntro: EDITORIAL_INTROS[slug],
    railKey: section?.railKey ?? page.railKey,
    imageCrop: IMAGE_CROP[slug],
    captionPlacement: CAPTION_PLACEMENT[slug],
    homepageTitle: HOMEPAGE_TITLES[slug],
    homepageSubtitle: HOMEPAGE_SUBTITLES[slug],
  };
}

export function buildCollectionsManifest(): CollectionsManifest {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    menu: COLLECTIONS_MENU,
    carouselSlugs: [...COLLECTION_SLUGS],
    homepageSlugs: [...COLLECTION_SLUGS],
    items: COLLECTION_SLUGS.map(manifestItemForSlug),
  };
}

export function getCollectionManifestItem(slug: string): CollectionManifestItem | null {
  if (!(slug in COLLECTION_PAGES)) return null;
  return manifestItemForSlug(slug as CollectionSlug);
}
