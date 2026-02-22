import { Link } from "wouter";
import { MATERIALS } from "@/lib/data";
import { ArrowRight } from "lucide-react";

export default function Materials() {
  const categories = {
    plant: MATERIALS.filter(m => m.category === 'plant'),
    animal: MATERIALS.filter(m => m.category === 'animal'),
    synthetic: MATERIALS.filter(m => m.category === 'synthetic'),
  };

  return (
    <div className="py-6 md:py-12 flex flex-col gap-10 md:gap-16">
      <header className="flex flex-col items-center text-center gap-4 md:gap-6 max-w-3xl mx-auto">
        <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-muted-foreground">Your Buying Reference</p>
        <h1 className="text-3xl md:text-6xl font-serif">The Fabric Guide</h1>
        <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed max-w-xl">
          Everything you need to know before you buy. Each guide includes what to look for, what to avoid, red flags, and what to pay.
        </p>
      </header>

      <div className="bg-secondary/50 -mx-4 md:-mx-8 px-4 md:px-8 py-8 md:py-12">
        <div className="max-w-3xl mx-auto text-center flex flex-col gap-4">
          <h2 className="text-lg md:text-xl font-serif">How to Use This Guide</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Click any material below to see the full buying rules — what labels to look for, which claims are misleading, and how much you should expect to pay for genuine quality. Bookmark the ones you buy most.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-12 md:gap-20">
        <section className="flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-1.5 md:gap-2 border-b border-border/40 pb-3 md:pb-4">
            <h2 className="text-2xl md:text-3xl font-serif">Plant-Based Fibers</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-widest">Cellulosic Materials</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {categories.plant.map(m => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-1.5 md:gap-2 border-b border-border/40 pb-3 md:pb-4">
            <h2 className="text-2xl md:text-3xl font-serif">Animal-Based Fibers</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-widest">Protein Materials</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {categories.animal.map(m => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-1.5 md:gap-2 border-b border-border/40 pb-3 md:pb-4">
            <h2 className="text-2xl md:text-3xl font-serif">Synthetics & Semi-Synthetics</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-widest">Manufactured Materials</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {categories.synthetic.map(m => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MaterialCard({ material }: { material: any }) {
  const topRule = material.buyingRules?.lookFor?.[0];
  const topAvoid = material.buyingRules?.avoid?.[0];

  return (
    <Link href={`/materials/${material.slug}`} className="group flex flex-col border border-border/40 hover:border-foreground/20 transition-colors active:scale-[0.98]" data-testid={`card-material-${material.id}`}>
      <div className="p-5 md:p-6 flex flex-col gap-3 flex-1">
        <div className="flex justify-between items-start">
          <h3 className="text-lg md:text-xl font-serif group-hover:text-muted-foreground transition-colors">{material.name}</h3>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1.5" />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{material.description}</p>
        {topRule && (
          <div className="mt-auto pt-3 border-t border-border/30">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Top Rule</p>
            <p className="text-xs text-foreground/70 line-clamp-1">{topRule}</p>
          </div>
        )}
      </div>
      <div className="bg-secondary/50 px-5 md:px-6 py-3 flex items-center justify-between">
        <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">
          {material.characteristics.length} characteristics
        </span>
        <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground font-medium">
          Read Rules
        </span>
      </div>
    </Link>
  );
}
