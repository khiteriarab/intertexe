import { Link } from "wouter";
import { ArrowRight, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function JustIn() {
  const { data: designers = [], isLoading } = useQuery({
    queryKey: ["designers"],
    queryFn: () => api.getDesigners(),
  });

  const sorted = [...(designers as any[])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const featured = sorted[0];
  const recent = sorted.slice(1, 7);
  const remaining = sorted.slice(7);

  return (
    <div className="py-6 md:py-12 flex flex-col gap-10 md:gap-16">
      <header className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
          <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Latest Additions</span>
        </div>
        <h1 className="text-3xl md:text-6xl font-serif" data-testid="text-just-in-title">Just In</h1>
        <p className="text-muted-foreground max-w-xl text-sm md:text-base">
          The newest designers and brands added to our directory, ranked by their commitment to natural fiber quality.
        </p>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-12 animate-pulse">
          <div className="h-[400px] bg-secondary" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="flex flex-col gap-4">
                <div className="aspect-[3/4] bg-secondary" />
                <div className="h-5 bg-secondary w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {featured && (
            <Link href={`/designers/${featured.slug}`} className="group active:scale-[0.99] transition-transform" data-testid={`card-featured-${featured.slug}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8 border border-border/40 group-hover:border-foreground/20 transition-colors">
                <div className="aspect-[16/9] md:aspect-auto bg-secondary relative overflow-hidden flex items-center justify-center">
                  <span className="font-serif text-[80px] md:text-[120px] text-muted-foreground/10">{featured.name.charAt(0)}</span>
                </div>
                <div className="flex flex-col justify-center gap-4 md:gap-6 p-5 md:p-12">
                  <div className="flex items-center gap-3">
                    <span className="bg-foreground text-background px-3 py-1 text-[10px] uppercase tracking-widest font-medium">Featured</span>
                    <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">New Arrival</span>
                  </div>
                  <h2 className="text-2xl md:text-5xl font-serif group-hover:text-muted-foreground transition-colors">{featured.name}</h2>
                  {featured.description && <p className="text-foreground/70 font-light leading-relaxed">{featured.description}</p>}
                  <div className="flex items-center gap-4 pt-4 border-t border-border/40">
                    {featured.naturalFiberPercent != null && (
                      <div className="flex flex-col">
                        <span className="text-3xl font-serif">{featured.naturalFiberPercent}%</span>
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">Natural Fibers</span>
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-2 text-sm uppercase tracking-widest group-hover:text-muted-foreground transition-colors">
                      View Profile <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {recent.length > 0 && (
            <section className="flex flex-col gap-6 md:gap-8">
              <h2 className="text-xl md:text-2xl font-serif border-b border-border/40 pb-3 md:pb-4">Recently Added</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {recent.map((designer: any) => (
                  <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-3 md:gap-4 active:scale-[0.98] transition-transform" data-testid={`card-recent-${designer.slug}`}>
                    <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center font-serif text-6xl text-muted-foreground/15">
                        {designer.name.charAt(0)}
                      </div>
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {designer.naturalFiberPercent != null && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/40 to-transparent">
                          <span className="text-white text-xs uppercase tracking-widest">{designer.naturalFiberPercent}% Natural</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-base md:text-xl font-serif group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                      {designer.description && <p className="text-sm text-muted-foreground line-clamp-2">{designer.description}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {remaining.length > 0 && (
            <section className="flex flex-col gap-6 md:gap-8">
              <h2 className="text-xl md:text-2xl font-serif border-b border-border/40 pb-3 md:pb-4">More Designers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {remaining.map((designer: any) => (
                  <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex items-center justify-between p-4 md:p-5 border border-border/40 hover:border-foreground/30 transition-colors active:scale-[0.98]" data-testid={`card-more-${designer.slug}`}>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-base md:text-lg font-serif group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                      <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest">{designer.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {designer.naturalFiberPercent != null && <span className="text-xl font-serif">{designer.naturalFiberPercent}%</span>}
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
