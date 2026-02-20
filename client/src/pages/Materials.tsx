import { MATERIALS } from "@/lib/data";

export default function Materials() {
  const categories = {
    plant: MATERIALS.filter(m => m.category === 'plant'),
    animal: MATERIALS.filter(m => m.category === 'animal'),
    synthetic: MATERIALS.filter(m => m.category === 'synthetic'),
  };

  return (
    <div className="py-6 md:py-12 flex flex-col gap-10 md:gap-16">
      <header className="flex flex-col items-center text-center gap-4 md:gap-6 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-6xl font-serif">The Fabric Guide</h1>
        <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed">
          Understanding what you wear is the first step to a curated wardrobe. 
          Explore the characteristics, origins, and care requirements of the world's most essential fibers.
        </p>
      </header>

      <div className="flex flex-col gap-12 md:gap-20">
        {/* Plant Based */}
        <section className="flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-1.5 md:gap-2 border-b border-border/40 pb-3 md:pb-4">
            <h2 className="text-2xl md:text-3xl font-serif">Plant-Based Fibers</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-widest">Cellulosic Materials</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
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
  return (
    <div className="group cursor-pointer flex flex-col gap-3 md:gap-4 active:scale-[0.97] transition-transform" data-testid={`card-material-${material.id}`}>
      <div className="aspect-square bg-secondary relative overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="font-serif text-2xl md:text-3xl text-muted-foreground/30">{material.name.charAt(0)}</span>
      </div>
      <div className="flex justify-between items-center gap-2">
        <h3 className="text-base md:text-lg font-serif group-hover:text-muted-foreground transition-colors">{material.name}</h3>
        <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground bg-secondary px-1.5 py-0.5 md:px-2 md:py-1 flex-shrink-0">
          Explore
        </span>
      </div>
    </div>
  );
}
