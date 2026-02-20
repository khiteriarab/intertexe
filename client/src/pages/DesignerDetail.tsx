import { useParams, Link } from "wouter";
import { Heart, ChevronLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function DesignerDetail() {
  const { slug } = useParams();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: designer, isLoading } = useQuery({
    queryKey: ["designer", slug],
    queryFn: () => api.getDesigner(slug!),
    enabled: !!slug,
  });

  const { data: favStatus } = useQuery({
    queryKey: ["favoriteCheck", designer?.id],
    queryFn: () => api.checkFavorite(designer.id),
    enabled: !!designer?.id,
  });

  const isSaved = favStatus?.favorited || false;

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await api.removeFavorite(designer.id);
      } else {
        await api.addFavorite(designer.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favoriteCheck", designer?.id] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast({
        title: isSaved ? "Removed from wishlist" : "Saved to wishlist",
        description: `${designer.name} has been ${isSaved ? "removed from" : "added to"} your favorites.`,
      });
    },
    onError: (err: any) => {
      if (!isAuthenticated) {
        toast({ title: "Sign in required", description: "Create an account to save favorites." });
      } else {
        toast({ title: "Error", description: err.message });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="py-8 md:py-12 flex flex-col gap-12 max-w-4xl mx-auto w-full animate-pulse">
        <div className="h-4 w-32 bg-secondary" />
        <div className="flex flex-col md:flex-row gap-16">
          <div className="w-full md:w-1/3 aspect-[3/4] bg-secondary" />
          <div className="flex-1 flex flex-col gap-8">
            <div className="h-12 bg-secondary w-3/4" />
            <div className="h-6 bg-secondary w-1/4" />
            <div className="h-32 bg-secondary w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!designer) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-4">
        <h1 className="text-2xl font-serif">Designer not found</h1>
        <Link href="/designers" className="border-b border-foreground pb-1 text-sm uppercase tracking-widest hover:text-muted-foreground transition-colors">
            Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12 flex flex-col gap-12 max-w-4xl mx-auto w-full">
      <Link href="/designers" className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground w-fit transition-colors" data-testid="link-back">
          <ChevronLeft className="w-4 h-4" /> Back to Directory
      </Link>

      <header className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
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
                onClick={() => toggleFav.mutate()}
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
              <span className="text-6xl font-serif">{designer.naturalFiberPercent}%</span>
              <span className="text-lg text-muted-foreground font-serif italic">Natural Fibers</span>
            </div>
            <div className="w-full h-1 bg-secondary mt-4 relative">
              <div 
                className="absolute top-0 left-0 h-full bg-foreground transition-all duration-700"
                style={{ width: `${designer.naturalFiberPercent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">About the Brand</span>
            <p className="text-lg text-foreground/80 leading-relaxed font-light">
              {designer.description || `${designer.name} is dedicated to utilizing high-quality materials, with a strong focus on natural fibers across their collections.`}
            </p>
          </div>
        </div>
      </header>
    </div>
  );
}
