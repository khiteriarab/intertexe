import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Natural Fabrics Guide — Cotton, Silk, Linen, Wool, Cashmere",
  description: "Learn about natural fabrics — cotton, silk, linen, wool, cashmere. Understand fiber quality, buying rules, and how to spot synthetic imitations. Shop 17,000+ verified products.",
  alternates: { canonical: "https://www.intertexe.com/natural-fabrics" },
};

const FABRICS = [
  { name: "Cotton", slug: "cotton", tagline: "The foundation of every wardrobe", desc: "Breathable, versatile, endlessly wearable." },
  { name: "Silk", slug: "silk", tagline: "Luxurious drape, timeless", desc: "The ultimate in luxury — nothing moves like silk." },
  { name: "Linen", slug: "linen", tagline: "Light, airy, effortless", desc: "Gets softer with every wash. Relaxed elegance." },
  { name: "Wool", slug: "wool", tagline: "Warm, structured, seasonless", desc: "Nature's performance fiber — temperature-regulating." },
  { name: "Cashmere", slug: "cashmere", tagline: "The softest fiber in the world", desc: "The pinnacle of luxury knitwear." },
];

export default function NaturalFabricsPage() {
  return (
    <div className="py-10 md:py-16 flex flex-col gap-12 md:gap-20">
      <header className="text-center max-w-2xl mx-auto flex flex-col gap-4">
        <h1 className="text-3xl md:text-5xl font-serif">Natural Fabrics</h1>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          The world&apos;s best fashion is made from natural fibers. Cotton, silk, linen, wool, and cashmere — each with unique properties that synthetic fabrics can never replicate.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {FABRICS.map(fabric => (
          <Link key={fabric.slug} href={`/materials/${fabric.slug}`} className="group flex flex-col gap-3 p-6 md:p-8 border border-border/30 hover:border-foreground/30 transition-colors">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{fabric.tagline}</p>
            <h2 className="text-2xl md:text-3xl font-serif">{fabric.name}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{fabric.desc}</p>
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] mt-2 group-hover:gap-2.5 transition-all">
              Explore {fabric.name} <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        ))}
      </div>

      <section className="text-center flex flex-col items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-serif">Shop by Fabric</h2>
        <p className="text-sm text-muted-foreground max-w-md">Browse 17,000+ verified products organized by fiber type.</p>
        <Link href="/materials" className="bg-foreground text-background px-8 py-3.5 uppercase tracking-[0.15em] text-xs font-medium hover:bg-foreground/90 transition-colors mt-2">
          Browse All Fabrics
        </Link>
      </section>
    </div>
  );
}
