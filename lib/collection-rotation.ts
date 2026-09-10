import { resolveWeeklyEditEditorial } from "./weekly-edit-season";

export const collectionRotation = [
  {
    name: "Vacation",
    url: "https://www.intertexe.com/collections/vacation",
    subline: "Last-minute pieces in linen, silk and cotton.",
  },
  {
    name: "Evening",
    url: "https://www.intertexe.com/collections/evening",
    subline: "For the occasion that deserves the real thing. Silk. Wool crêpe. Verified.",
  },
  {
    name: "Tailoring",
    url: "https://www.intertexe.com/collections/tailoring",
    subline:
      "Investment dressing. The pieces that outlast every trend. Wool. Cashmere. Cotton. Verified.",
  },
  {
    name: "The Fall Edit",
    url: "https://www.intertexe.com/collections/fall-edit",
    subline: "Transitional luxury. Cashmere that layers. Suede with weight. Verified.",
  },
  {
    name: "The Leather Edit",
    url: "https://www.intertexe.com/collections/leather-edit",
    subline: "Leather with weight. Suede with texture. Jackets, skirts, boots — verified.",
  },
];

export function getCollectionForWeek(weekNumber: number) {
  const { collection } = resolveWeeklyEditEditorial(weekNumber);
  return {
    name: collection.name,
    url: collection.url,
    subline: collection.subline,
  };
}
