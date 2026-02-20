import { Link } from "wouter";

export default function About() {
  return (
    <div className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-10 md:gap-16">
      <header className="flex flex-col gap-4 md:gap-6">
        <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Our Story</span>
        <h1 className="text-3xl md:text-6xl font-serif" data-testid="text-about-title">About <span className="tracking-widest uppercase">Intertexe</span></h1>
      </header>

      <div className="flex flex-col gap-8 md:gap-12 text-base md:text-lg text-foreground/80 leading-relaxed font-light">
        <p>
          Intertexe was founded on a simple belief: what your clothes are made of matters more than any label, trend, or price tag. We created the first fashion discovery platform that ranks designers by the quality of their materials — specifically, their commitment to natural fibers.
        </p>

        <div className="border-l-2 border-foreground pl-6 md:pl-8 py-2">
          <p className="font-serif text-xl md:text-2xl text-foreground/90 italic">
            "The fabric is the foundation of everything. Without exceptional materials, even the most beautiful design falls short."
          </p>
        </div>

        <p>
          Our directory features over 11,000 designers and brands, each evaluated on the percentage of natural fibers used across their collections. From heritage houses like Loro Piana and Brunello Cucinelli to emerging ateliers pushing the boundaries of sustainable luxury, we give you a transparent view into what truly makes a garment exceptional.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 py-6 md:py-8 border-y border-border/40">
          <div className="flex flex-col gap-2" data-testid="stat-designers">
            <span className="text-4xl md:text-5xl font-serif">11,900+</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Designers Indexed</span>
          </div>
          <div className="flex flex-col gap-2" data-testid="stat-fibers">
            <span className="text-4xl md:text-5xl font-serif">100%</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Material Transparency</span>
          </div>
          <div className="flex flex-col gap-2" data-testid="stat-mission">
            <span className="text-4xl md:text-5xl font-serif">1</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Mission: Quality First</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground">Our Mission</h2>
          <p>
            We believe consumers deserve to know exactly what goes into the clothes they wear. By making material composition data accessible and easy to understand, we empower you to make informed choices that align with your values — whether that means prioritizing sustainability, comfort, durability, or all three.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground">How It Works</h2>
          <p>
            Every designer in our directory is scored based on the natural fiber percentage across their collections. This score reflects the proportion of materials like cotton, silk, wool, linen, and cashmere relative to synthetic alternatives. Our editorial team continuously reviews and updates these scores to ensure accuracy.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground">Join Us</h2>
          <p>
            Whether you're a conscious consumer seeking better fabrics or a designer proud of your material choices, Intertexe is your home. Take our{" "}
            <Link href="/quiz" className="border-b border-foreground hover:text-muted-foreground transition-colors">Style Quiz</Link>{" "}
            to discover brands that match your preferences, or{" "}
            <Link href="/contact" className="border-b border-foreground hover:text-muted-foreground transition-colors">get in touch</Link>{" "}
            — we'd love to hear from you.
          </p>
        </div>
      </div>
    </div>
  );
}
