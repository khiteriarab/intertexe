/**
 * KHITERI'S EDIT — monthly editorial landing config.
 *
 * To publish a new month, update ACTIVE_KHITERIS_EDIT:
 * - monthLabel
 * - subtitle (optional)
 * - coverImage
 * - moodBoard.images (+ optional caption)
 * - products (exactly 10)
 *
 * Everything else (copy, layout, CTAs) stays the same.
 */

const BASE = "https://www.intertexe.com";

export type KhiterisEditImage = {
  src: string;
  alt: string;
};

export type KhiterisEditProduct = {
  id: string;
  name: string;
  composition: string;
  price: string;
  brand: string;
  image: KhiterisEditImage;
};

export type KhiterisEditConfig = {
  /** URL slug — always "khiteri" for intertexe.com/khiteri */
  slug: "khiteri";
  monthLabel: string;
  title: string;
  subtitle?: string;
  coverImage: KhiterisEditImage;
  moodBoard: {
    caption?: string;
    images: KhiterisEditImage[];
  };
  products: KhiterisEditProduct[];
};

/** July 2026 — placeholder products; swap images and copy when curating each month. */
export const KHITERIS_EDIT_JULY_2026: KhiterisEditConfig = {
  slug: "khiteri",
  monthLabel: "July 2026",
  title: "KHITERI'S EDIT",
  subtitle: "10 natural-fiber pieces I'm loving this month.",
  coverImage: {
    src: `${BASE}/editorial-vacation.jpg`,
    alt: "Mediterranean summer editorial",
  },
  moodBoard: {
    caption: "Salt air, linen, and nowhere to be.",
    images: [
      {
        src: `${BASE}/editorial-vacation.jpg`,
        alt: "Coastal light on stone",
      },
      {
        src: "/fabrics/fabric-linen.jpg",
        alt: "Natural linen texture",
      },
      {
        src: "/fabrics/fabric-silk.jpg",
        alt: "Silk in soft daylight",
      },
      {
        src: "/fabrics/fabric-cotton.jpg",
        alt: "Cotton weave close-up",
      },
    ],
  },
  products: [
    {
      id: "01",
      name: "Oversized Linen Shirt",
      composition: "100% Linen",
      price: "$285",
      brand: "Brand Placeholder",
      image: { src: "/fabrics/fabric-linen.jpg", alt: "Linen shirt placeholder" },
    },
    {
      id: "02",
      name: "Silk Slip Dress",
      composition: "100% Silk",
      price: "$420",
      brand: "Brand Placeholder",
      image: { src: "/fabrics/fabric-silk.jpg", alt: "Silk dress placeholder" },
    },
    {
      id: "03",
      name: "Wide-Leg Cotton Trouser",
      composition: "100% Organic Cotton",
      price: "$195",
      brand: "Brand Placeholder",
      image: { src: "/fabrics/fabric-cotton.jpg", alt: "Cotton trouser placeholder" },
    },
    {
      id: "04",
      name: "Cashmere Tank",
      composition: "100% Cashmere",
      price: "$310",
      brand: "Brand Placeholder",
      image: { src: "/fabrics/fabric-cashmere.jpg", alt: "Cashmere tank placeholder" },
    },
    {
      id: "05",
      name: "Linen Midi Skirt",
      composition: "100% Linen",
      price: "$245",
      brand: "Brand Placeholder",
      image: { src: "/fabrics/fabric-linen.jpg", alt: "Linen skirt placeholder" },
    },
    {
      id: "06",
      name: "Silk Camisole",
      composition: "100% Silk",
      price: "$168",
      brand: "Brand Placeholder",
      image: { src: "/fabrics/fabric-silk.jpg", alt: "Silk camisole placeholder" },
    },
    {
      id: "07",
      name: "Merino Wool Cardigan",
      composition: "100% Merino Wool",
      price: "$395",
      brand: "Brand Placeholder",
      image: { src: "/fabrics/fabric-wool.jpg", alt: "Wool cardigan placeholder" },
    },
    {
      id: "08",
      name: "Cotton Poplin Dress",
      composition: "100% Cotton",
      price: "$275",
      brand: "Brand Placeholder",
      image: { src: "/fabrics/fabric-cotton.jpg", alt: "Cotton dress placeholder" },
    },
    {
      id: "09",
      name: "Linen Blazer",
      composition: "100% Linen",
      price: "$520",
      brand: "Brand Placeholder",
      image: { src: "/fabrics/fabric-linen.jpg", alt: "Linen blazer placeholder" },
    },
    {
      id: "10",
      name: "Silk Scarf",
      composition: "100% Silk",
      price: "$145",
      brand: "Brand Placeholder",
      image: { src: "/fabrics/fabric-silk.jpg", alt: "Silk scarf placeholder" },
    },
  ],
};

/** Point to the current month's config. Swap this export when publishing a new edit. */
export const ACTIVE_KHITERIS_EDIT = KHITERIS_EDIT_JULY_2026;

export function getKhiterisEditConfig(): KhiterisEditConfig {
  return ACTIVE_KHITERIS_EDIT;
}
