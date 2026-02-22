import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners } from "@/lib/supabase";
import heroImage from "@/assets/images/hero-fashion.jpg";
import textureImage from "@/assets/images/material-texture.jpg";

export default function Home() {
  const { data: designers = [], isLoading } = useQuery({
    queryKey: ["designers-home"],
    queryFn: () => fetchDesigners(undefined, 4),
  });

  const topDesigners = designers.slice(0, 4);

  return (
    <div className="flex flex-col gap-16 md:gap-24 py-6 md:py-16">
      
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] min-h-[420px] md:min-h-[500px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage}
            alt="Luxury Fashion Editorial" 
            className="w-full h-full object-cover object-center opacity-90"
          />
          <div className="absolute inset-0 bg-black/20 mix-blend-multiply" />
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-3xl flex flex-col items-center">
          <h1 className="text-3xl md:text-6xl lg:text-7xl font-serif text-white mb-4 md:mb-6 leading-tight" data-testid="text-hero-headline">
            Material-first fashion for women who expect quality in every fiber.
          </h1>
          <p className="text-base md:text-xl text-white/90 mb-8 md:mb-10 max-w-xl font-light tracking-wide" data-testid="text-hero-subtext">
            Discover designers and pieces ranked by fabric composition.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link href="/quiz" className="bg-white text-black px-6 py-3.5 md:px-8 md:py-4 uppercase tracking-widest text-xs md:text-sm font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2 active:scale-95" data-testid="button-take-quiz">
                Take Quiz <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/designers" className="border border-white text-white px-6 py-3.5 md:px-8 md:py-4 uppercase tracking-widest text-xs md:text-sm font-medium hover:bg-white/10 transition-colors text-center active:scale-95" data-testid="button-browse-designers">
                Browse Designers
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Designers */}
      <section className="flex flex-col gap-6 md:gap-10">
        <div className="flex justify-between items-end border-b border-border/50 pb-3 md:pb-4">
          <h2 className="text-2xl md:text-3xl font-serif">Curated Designers</h2>
          <Link href="/designers" className="text-sm uppercase tracking-widest hover:text-muted-foreground transition-colors hidden sm:block" data-testid="link-view-all-designers">
              View All
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex flex-col gap-4 animate-pulse">
                <div className="aspect-[3/4] bg-secondary" />
                <div className="h-5 bg-secondary w-3/4" />
                <div className="h-4 bg-secondary w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {topDesigners.map((designer: any) => (
              <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-3 md:gap-4 active:scale-[0.98] transition-transform" data-testid={`card-designer-${designer.id}`}>
                  <div className="aspect-[3/4] bg-secondary w-full overflow-hidden relative">
                     <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-serif text-4xl">
                       {designer.name.charAt(0)}
                     </div>
                     <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-serif text-base md:text-xl group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                    {designer.naturalFiberPercent != null && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-medium">{designer.naturalFiberPercent}%</span>
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">Natural Fibers</span>
                      </div>
                    )}
                  </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Material Focus */}
      <section className="bg-secondary/50 -mx-4 md:-mx-8 px-4 md:px-8 py-12 md:py-24">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="flex flex-col gap-4 md:gap-6 max-w-lg">
            <h2 className="text-3xl md:text-5xl font-serif leading-tight">The Fabric of Luxury</h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              We believe true luxury begins with the raw materials. Explore our comprehensive guide to natural fibers, from Mongolian cashmere to organic silk.
            </p>
            <Link href="/materials" className="mt-4 border-b border-foreground w-fit pb-1 uppercase tracking-widest text-sm font-medium hover:text-muted-foreground hover:border-muted-foreground transition-colors" data-testid="link-explore-materials">
                Explore Materials
            </Link>
          </div>
          <div className="aspect-square bg-muted relative overflow-hidden rounded-sm">
            <img 
              src={textureImage}
              alt="Material Texture" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Editorial Call to Action */}
      <section className="text-center py-12 md:py-24 max-w-2xl mx-auto flex flex-col items-center gap-6 md:gap-8">
        <h2 className="text-2xl md:text-5xl font-serif leading-tight">Find Your Material Match</h2>
        <p className="text-muted-foreground text-sm md:text-lg">
          Take our quick quiz to receive personalized designer and product recommendations based on your material preferences and lifestyle.
        </p>
        <Link href="/quiz" className="bg-foreground text-background px-8 py-3.5 md:px-10 md:py-4 uppercase tracking-widest text-xs md:text-sm font-medium hover:bg-foreground/90 transition-colors mt-2 md:mt-4 active:scale-95" data-testid="button-cta-quiz">
            Start the Quiz
        </Link>
      </section>
    </div>
  );
}
