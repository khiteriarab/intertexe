import { useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Designers() {
  const [search, setSearch] = useState("");

  const { data: designers = [], isLoading } = useQuery({
    queryKey: ["designers", search],
    queryFn: () => api.getDesigners(search || undefined),
  });

  const grouped = (designers as any[]).reduce((acc: Record<string, any[]>, designer: any) => {
    const letter = designer.name.charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(designer);
    return acc;
  }, {});

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="py-8 md:py-12 flex flex-col gap-12">
      <header className="flex flex-col items-center text-center gap-6 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-serif">The Directory</h1>
        <p className="text-muted-foreground">
          Explore our curated index of designers committed to exceptional material quality.
        </p>

        <div className="relative w-full max-w-md mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search designers..."
            className="w-full bg-background border border-border/60 pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 uppercase tracking-widest"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-designers"
          />
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-12 mt-8">
        <aside className="hidden md:block w-8 shrink-0 sticky top-32 h-fit">
          <nav className="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
            {alphabet.map(letter => (
              <a 
                key={letter} 
                href={`#letter-${letter}`}
                className={`hover:text-foreground transition-colors ${!grouped[letter] ? 'opacity-30 pointer-events-none' : ''}`}
                data-testid={`link-jump-${letter}`}
              >
                {letter}
              </a>
            ))}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col gap-16">
          {isLoading ? (
            <div className="flex flex-col gap-8 animate-pulse">
              {[1,2,3].map(i => (
                <div key={i}>
                  <div className="h-8 w-12 bg-secondary mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(j => <div key={j} className="h-16 bg-secondary" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : Object.entries(grouped).length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No designers found.</div>
          ) : (
            Object.keys(grouped).sort().map(letter => (
              <section key={letter} id={`letter-${letter}`} className="flex flex-col gap-6 scroll-mt-24">
                <h2 className="text-4xl font-serif border-b border-border/40 pb-4 text-foreground/80">{letter}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {grouped[letter].map((designer: any) => (
                    <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-3 py-2" data-testid={`card-designer-${designer.slug}`}>
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-xl font-serif group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                          <span className="text-xs tracking-wider text-muted-foreground">{designer.naturalFiberPercent}% Natural</span>
                        </div>
                        <div className="h-px w-full bg-border/40 group-hover:bg-foreground/20 transition-colors" />
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
