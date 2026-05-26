/**
 * "Wear to where" — NAP-style editorial destinations (moods + collections).
 */
import type { CollectionSlug } from "./collection-pages";
import { editorialHeroForSlug, EDITORIAL_HERO } from "./editorial-assets";
import { MOOD_CATALOG, type MoodConfig, type MoodSlug } from "./mood-commerce";
import { COLLECTION_SECTIONS } from "./site-architecture";
import {
  collectionMoodLabels,
  getMoodHeroImage,
} from "./collection-moods";
import type { Product } from "./supabase-server";

/** Verified editorial heroes for Vacation “Wear to where” tiles (object-position: top). */
const VACATION_MOOD_HERO_BY_SLUG: Partial<Record<MoodSlug, string>> = {
  "mediterranean-luxury":
    "https://img.mytheresa.com/1094/1094/95/jpeg/catalog/product/97/P00817845.jpg",
  "resort-dressing":
    "https://img.mytheresa.com/1094/1094/95/jpeg/catalog/product/5a/P01196498.jpg",
  "linen-movement":
    "https://img.mytheresa.com/1094/1094/95/jpeg/catalog/product/be/P01194268.jpg",
  "woven-textures":
    "https://img.mytheresa.com/1094/1094/95/jpeg/catalog/product/4c/P01184379.jpg",
  "raffia-accessories":
    "https://img.mytheresa.com/1094/1094/95/jpeg/catalog/product/8e/P01179122.jpg",
  "beach-dinners":
    "https://img.mytheresa.com/1094/1094/95/jpeg/catalog/product/c0/P01181453.jpg",
  "warm-neutrals":
    "https://img.mytheresa.com/1094/1094/95/jpeg/catalog/product/5a/P01196498.jpg",
};

const MOOD_IMAGES: Partial<Record<MoodSlug, string>> = {
  ...VACATION_MOOD_HERO_BY_SLUG,
  "silk-at-sunset": EDITORIAL_HERO.silk,
  "white-cotton": EDITORIAL_HERO["white-edit"],
  "destination-energy": EDITORIAL_HERO.vacation,
  ibiza: EDITORIAL_HERO.vacation,
  amalfi: EDITORIAL_HERO.linen,
  hydra: EDITORIAL_HERO["white-edit"],
  "st-barths": EDITORIAL_HERO.silk,
};

export function moodImageUrl(mood: MoodConfig): string {
  return MOOD_IMAGES[mood.slug] ?? editorialHeroForSlug(mood.collection);
}

export function moodsForCollection(slug: CollectionSlug): MoodConfig[] {
  return MOOD_CATALOG.filter((m) => m.collection === slug);
}

export type WearToWhereCard = {
  href: string;
  label: string;
  kicker?: string;
  imageUrl: string;
  editorialOnly?: boolean;
};

export function wearToWhereCardsForCollection(slug: CollectionSlug): WearToWhereCard[] {
  return moodsForCollection(slug).map((m) => ({
    href: `/moods/${m.slug}`,
    label: m.label,
    kicker: m.kicker,
    imageUrl: moodImageUrl(m),
  }));
}

/** Editorial rail cards with unique product-matched hero images (no duplicate URLs). */
export function wearToWhereEditorialCards(
  slug: CollectionSlug,
  products: Product[]
): WearToWhereCard[] {
  const labels = collectionMoodLabels(slug);
  const moods = moodsForCollection(slug);
  if (!labels.length) {
    return wearToWhereCardsForCollection(slug).map((c) => ({
      ...c,
      editorialOnly: true,
      href: "#",
    }));
  }

  const usedImages = new Set<string>();
  return labels.map((label) => {
    const mood =
      moods.find(
        (m) =>
          m.kicker.toLowerCase() === label.toLowerCase() ||
          m.label.toLowerCase() === label.toLowerCase()
      ) ?? moods.find((m) => m.label.includes(label.split(" ")[0] ?? ""));
    const fallback = mood ? moodImageUrl(mood) : editorialHeroForSlug(slug);
    const fixedVacation =
      slug === "vacation" && mood?.slug
        ? VACATION_MOOD_HERO_BY_SLUG[mood.slug as MoodSlug]
        : undefined;
    const imageUrl =
      fixedVacation ||
      getMoodHeroImage(label, products, slug, usedImages, fallback) ||
      fallback;
    return {
      href: "#",
      label: mood?.label ?? label,
      kicker: mood?.kicker ?? label,
      imageUrl,
      editorialOnly: true,
    };
  });
}

/** Text options for shop filter sheet (no images — carousel lives in mobile menu). */
export type WearToWhereTextOption = {
  key: string;
  label: string;
  href: string;
};

export function shopWearToWhereTextOptions(): WearToWhereTextOption[] {
  const collections: WearToWhereTextOption[] = COLLECTION_SECTIONS.map((c) => ({
    key: `collection-${c.slug}`,
    label: c.label,
    href: c.href,
  }));
  const moods: WearToWhereTextOption[] = MOOD_CATALOG.map((m) => ({
    key: `mood-${m.slug}`,
    label: m.label,
    href: `/moods/${m.slug}`,
  }));
  return [...collections, ...moods];
}
