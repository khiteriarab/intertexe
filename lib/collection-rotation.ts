export const collectionRotation = [
  {
    name: "Vacation",
    url: "https://www.intertexe.com/collections/vacation",
    subline:
      "Resort dressing for warm water and warm light. Linen that moves. Silk at sunset. Composition verified.",
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
    name: "Summer in the City",
    url: "https://www.intertexe.com/collections/summer-in-the-city",
    subline: "Downtown luxury. Lightweight. Breathable. The real thing.",
  },
  {
    name: "The White Edit",
    url: "https://www.intertexe.com/collections/white-edit",
    subline: "White in every form. Ivory. Chalk. Cream. All natural.",
  },
];

export function getCollectionForWeek(weekNumber: number) {
  return collectionRotation[weekNumber % collectionRotation.length];
}
