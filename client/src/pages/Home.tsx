import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { DESIGNERS } from "@/lib/data";

export default function Home() {
  return (
    <div className="flex flex-col gap-24 py-8 md:py-16">
      
      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden rounded-sm">
        <div className="absolute inset-0 z-0">
          <img 
            src="/src/assets/images/hero-fashion.jpg" 
            alt="Luxury Fashion Editorial" 
            className="w-full h-full object-cover object-center opacity-90"
            onError={(e) => {
              // Fallback if stock image fails to load
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop";
            }}
          />
          <div className="absolute inset-0 bg-black/20 mix-blend-multiply" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-3xl flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white mb-6 leading-tight" data-testid="text-hero-headline">
            Material-first fashion for women who expect quality in every fiber.
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-xl font-light tracking-wide" data-testid="text-hero-subtext">
            Discover designers and pieces ranked by fabric composition.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/quiz">
              <a className="bg-white text-black px-8 py-4 uppercase tracking-widest text-sm font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2" data-testid="button-take-quiz">
                Take Quiz <ArrowRight className="w-4 h-4" />
              </a>
            </Link>
            <Link href="/designers">
              <a className="border border-white text-white px-8 py-4 uppercase tracking-widest text-sm font-medium hover:bg-white/10 transition-colors text-center" data-testid="button-browse-designers">
                Browse Designers
              </a>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Designers */}
      <section className="flex flex-col gap-10">
        <div className="flex justify-between items-end border-b border-border/50 pb-4">
          <h2 className="text-3xl font-serif">Curated Designers</h2>
          <Link href="/designers">
            <a className="text-sm uppercase tracking-widest hover:text-muted-foreground transition-colors hidden sm:block" data-testid="link-view-all-designers">
              View All
            </a>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {DESIGNERS.slice(0, 4).map((designer) => (
            <Link key={designer.id} href={`/designers/${designer.slug}`}>
              <a className="group flex flex-col gap-4" data-testid={`card-designer-${designer.id}`}>
                <div className="aspect-[3/4] bg-secondary w-full overflow-hidden relative">
                   <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-serif text-4xl">
                     {designer.name.charAt(0)}
                   </div>
                   {/* Hover overlay */}
                   <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-serif text-xl group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium">{designer.natural_fiber_percent}%</span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Natural Fibers</span>
                  </div>
                </div>
              </a>
            </Link>
          ))}
        </div>
      </section>

      {/* Material Focus */}
      <section className="bg-secondary/50 -mx-4 md:-mx-8 px-4 md:px-8 py-16 md:py-24">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6 max-w-lg">
            <h2 className="text-4xl md:text-5xl font-serif leading-tight">The Fabric of Luxury</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We believe true luxury begins with the raw materials. Explore our comprehensive guide to natural fibers, from Mongolian cashmere to organic silk.
            </p>
            <Link href="/materials">
              <a className="mt-4 border-b border-foreground w-fit pb-1 uppercase tracking-widest text-sm font-medium hover:text-muted-foreground hover:border-muted-foreground transition-colors" data-testid="link-explore-materials">
                Explore Materials
              </a>
            </Link>
          </div>
          <div className="aspect-square bg-muted relative overflow-hidden rounded-sm">
            <img 
              src="/src/assets/images/material-texture.jpg" 
              alt="Material Texture" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?q=80&w=1972&auto=format&fit=crop";
              }}
            />
          </div>
        </div>
      </section>

      {/* Editorial Call to Action */}
      <section className="text-center py-16 md:py-24 max-w-2xl mx-auto flex flex-col items-center gap-8">
        <h2 className="text-3xl md:text-5xl font-serif leading-tight">Find Your Material Match</h2>
        <p className="text-muted-foreground text-lg">
          Take our quick quiz to receive personalized designer and product recommendations based on your material preferences and lifestyle.
        </p>
        <Link href="/quiz">
          <a className="bg-foreground text-background px-10 py-4 uppercase tracking-widest text-sm font-medium hover:bg-foreground/90 transition-colors mt-4" data-testid="button-cta-quiz">
            Start the Quiz
          </a>
        </Link>
      </section>

    </div>
  );
}
