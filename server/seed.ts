import { db } from "./db";
import { designers } from "@shared/schema";
import { sql } from "drizzle-orm";

const SEED_DESIGNERS = [
  { name: "Acne Studios", slug: "acne-studios", status: "live", naturalFiberPercent: 78, description: "Stockholm-born fashion house with a multidisciplinary approach to design, rooted in fabric innovation." },
  { name: "Bottega Veneta", slug: "bottega-veneta", status: "live", naturalFiberPercent: 88, description: "Italian luxury maison known for artisanal craftsmanship and signature intrecciato weaving." },
  { name: "Brunello Cucinelli", slug: "brunello-cucinelli", status: "live", naturalFiberPercent: 96, description: "Luxury craftsmanship rooted in humanist philosophy and the finest Italian cashmere." },
  { name: "Chloé", slug: "chloe", status: "live", naturalFiberPercent: 80, description: "Parisian maison blending romanticism with a free-spirited femininity in every collection." },
  { name: "COS", slug: "cos", status: "live", naturalFiberPercent: 70, description: "Refined essentials where modern design meets quality materials at considered price points." },
  { name: "Eileen Fisher", slug: "eileen-fisher", status: "live", naturalFiberPercent: 88, description: "Simple shapes and beautiful, sustainable fabrics designed for real life." },
  { name: "Gabriela Hearst", slug: "gabriela-hearst", status: "live", naturalFiberPercent: 94, description: "Luxury with purpose — merging sustainability with the highest quality natural fibers." },
  { name: "Hermès", slug: "hermes", status: "live", naturalFiberPercent: 95, description: "The pinnacle of French artisanship, from silk scarves to cashmere knits." },
  { name: "Jil Sander", slug: "jil-sander", status: "live", naturalFiberPercent: 90, description: "Purity, minimalism, and an unwavering commitment to high-quality materials." },
  { name: "Khaite", slug: "khaite", status: "live", naturalFiberPercent: 85, description: "Balancing opposing elements to create signature silhouettes in luxurious fabrications." },
  { name: "Lemaire", slug: "lemaire", status: "live", naturalFiberPercent: 82, description: "Refined Parisian wardrobe essentials that celebrate the art of dressing." },
  { name: "Loewe", slug: "loewe", status: "live", naturalFiberPercent: 86, description: "Spanish luxury house fusing craft and modernity under the creative direction of bold vision." },
  { name: "Loro Piana", slug: "loro-piana", status: "live", naturalFiberPercent: 98, description: "The world's finest cashmere, vicuña, and wool — unmatched material excellence." },
  { name: "Max Mara", slug: "max-mara", status: "live", naturalFiberPercent: 84, description: "Italian elegance defined by iconic outerwear and the finest wool coats." },
  { name: "Nanushka", slug: "nanushka", status: "live", naturalFiberPercent: 75, description: "Modern bohemian aesthetic with emphasis on craftsmanship and alternative materials." },
  { name: "Nili Lotan", slug: "nili-lotan", status: "live", naturalFiberPercent: 80, description: "Effortless New York style built on luxurious basics and impeccable tailoring." },
  { name: "The Row", slug: "the-row", status: "live", naturalFiberPercent: 92, description: "Exceptional fabrics, impeccable details, and precise tailoring for the modern woman." },
  { name: "Toteme", slug: "toteme", status: "live", naturalFiberPercent: 82, description: "Exploring the appeal of a modern uniform through distinct Scandinavian design cues." },
  { name: "Vince", slug: "vince", status: "live", naturalFiberPercent: 76, description: "California-inspired luxury essentials in cashmere, silk, and premium cotton." },
  { name: "Zimmermann", slug: "zimmermann", status: "live", naturalFiberPercent: 72, description: "Australian resort wear celebrating femininity through silk, linen, and intricate prints." },
];

export async function seedDesigners() {
  const existing = await db.select({ id: designers.id }).from(designers).limit(1);
  if (existing.length > 0) {
    console.log("Designers already seeded, skipping.");
    return;
  }

  await db.insert(designers).values(SEED_DESIGNERS);
  console.log(`Seeded ${SEED_DESIGNERS.length} designers.`);
}
