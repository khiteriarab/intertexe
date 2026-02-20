import { useParams, Link } from "wouter";
import { DESIGNERS } from "@/lib/data";
import { Heart, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function DesignerDetail() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  
  const designer = DESIGNERS.find(d => d.slug === slug);

  if (!designer) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-4">
        <h1 className="text-2xl font-serif">Designer not found</h1>
        <Link href="/designers">
          <a className="border-b border-foreground pb-1 text-sm uppercase tracking-widest hover:text-muted-foreground transition-colors">
            Back to Directory
          </a>
        </Link>
      </div>
    );
  }

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "Removed from wishlist" : "Saved to wishlist",
      description: `${designer.name} has been ${isSaved ? 'removed from' : 'added to'} your favorites.`,
    });
  };

  return (
    <div className="py-8 md:py-12 flex flex-col gap-12 max-w-4xl mx-auto w-full">
      <Link href="/designers">
        <a className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground w-fit transition-colors" data-testid="link-back">
          <ChevronLeft className="w-4 h-4" /> Back to Directory
        </a>
      </Link>

      <header className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
        {/* Abstract portrait / initial placeholder */}
        <div className="w-full md:w-1/3 aspect-[3/4] bg-secondary relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 flex items-center justify-center font-serif text-8xl text-muted-foreground/20">
            {designer.name.charAt(0)}
          </div>
        </div>

        <div className="flex flex-col gap-8 flex-1 w-full pt-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-start w-full">
              <h1 className="text-4xl md:text-6xl font-serif leading-tight">{designer.name}</h1>
              <button 
                onClick={handleSave}
                className="p-3 bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
                data-testid={`button-save-${designer.slug}`}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-foreground text-foreground' : 'text-foreground'}`} strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 mt-4">
              <span className={`px-3 py-1 text-xs uppercase tracking-widest border ${
                designer.status === 'live' ? 'border-foreground text-foreground' : 'border-muted-foreground text-muted-foreground'
              }`}>
                {designer.status}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 py-8 border-y border-border/40">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Material Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-serif">{designer.natural_fiber_percent}%</span>
              <span className="text-lg text-muted-foreground font-serif italic">Natural Fibers</span>
            </div>
            {/* Progress bar visual */}
            <div className="w-full h-1 bg-secondary mt-4 relative">
              <div 
                className="absolute top-0 left-0 h-full bg-foreground"
                style={{ width: `${designer.natural_fiber_percent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">About the Brand</span>
            <p className="text-lg text-foreground/80 leading-relaxed font-light">
              {designer.description || `${designer.name} is dedicated to utilizing high-quality materials, with a strong focus on natural fibers across their collections. They consistently rank high in our material quality index.`}
            </p>
          </div>
        </div>
      </header>

      {/* Mock pieces section */}
      <section className="flex flex-col gap-8 pt-12 border-t border-border/40">
         <h2 className="text-2xl font-serif">Featured Pieces</h2>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
           {[1, 2, 3, 4].map((i) => (
             <div key={i} className="flex flex-col gap-3 group cursor-pointer" data-testid={`card-piece-${i}`}>
               <div className="aspect-[3/4] bg-secondary/50 relative overflow-hidden group-hover:opacity-90 transition-opacity">
                 {/* Placeholder for garment */}
               </div>
               <div className="flex flex-col">
                 <span className="text-sm font-medium">Garment {i}</span>
                 <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{i % 2 === 0 ? '100% Cashmere' : '100% Silk'}</span>
               </div>
             </div>
           ))}
         </div>
      </section>
    </div>
  );
}
