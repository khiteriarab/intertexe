import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Check, ArrowRight, ArrowLeft, Loader2, Search, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fetchDesigners } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

const MATERIAL_OPTIONS = [
  "Cotton", "Silk", "Linen", "Wool", "Cashmere", "Leather / Suede",
  "Tencel / Modal", "Viscose / Rayon", "Alpaca", "Denim", "Velvet", "Satin"
];

const STEPS = [
  { id: 'materials', title: 'Materials' },
  { id: 'spend', title: 'Spend' },
  { id: 'synthetics', title: 'Synthetics' },
  { id: 'brands', title: 'Brands' },
  { id: 'results', title: 'Results' }
];

export default function Quiz() {
  const [currentStep, setCurrentStep] = useState(0);
  const [recommendation, setRecommendation] = useState<any>(null);

  const { data: designers = [] } = useQuery({
    queryKey: ["designers"],
    queryFn: () => fetchDesigners(),
  });

  const [selections, setSelections] = useState({
    materials: [] as string[],
    spend: "",
    syntheticTolerance: "",
    brands: [] as string[]
  });

  const { isAuthenticated } = useAuth();

  const recommendMutation = useMutation({
    mutationFn: () => api.getRecommendation({
      materials: selections.materials,
      priceRange: selections.spend,
      syntheticTolerance: selections.syntheticTolerance,
      favoriteBrands: selections.brands,
    }),
    onSuccess: (data) => {
      setRecommendation(data);
      setCurrentStep(STEPS.length - 1);

      const quizData = {
        materials: selections.materials,
        priceRange: selections.spend,
        syntheticTolerance: selections.syntheticTolerance,
        favoriteBrands: selections.brands,
        profileType: data.profileType,
        recommendation: data.recommendation,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem("intertexe_pending_quiz", JSON.stringify(quizData));

      if (isAuthenticated) {
        api.submitQuiz({
          materials: selections.materials,
          priceRange: selections.spend,
          syntheticTolerance: selections.syntheticTolerance,
          favoriteBrands: selections.brands,
          profileType: data.profileType,
          recommendation: data.recommendation,
        }).then(() => {
          localStorage.removeItem("intertexe_pending_quiz");
        }).catch(() => {});
      }
    },
  });

  const nextStep = () => {
    if (currentStep === STEPS.length - 2) {
      recommendMutation.mutate();
    } else {
      setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0));

  const toggleSelection = (key: 'materials' | 'brands', value: string) => {
    setSelections(prev => {
      const current = prev[key];
      return { ...prev, [key]: current.includes(value) ? current.filter(i => i !== value) : [...current, value] };
    });
  };

  const setSingleSelection = (key: 'spend' | 'syntheticTolerance', value: string) => {
    setSelections(prev => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selections.materials.length > 0;
      case 1: return selections.spend !== "";
      case 2: return selections.syntheticTolerance !== "";
      case 3: return true;
      default: return true;
    }
  };

  if (currentStep === STEPS.length - 1 && recommendation) {
    return <QuizResults selections={selections} recommendation={recommendation} designers={designers} />;
  }

  if (recommendMutation.isPending) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center px-4">
        <Loader2 className="w-10 h-10 animate-spin text-foreground/40" />
        <h2 className="text-2xl md:text-3xl font-serif">Curating Your Profile</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Our AI is analyzing your preferences to find designers that match your material standards...
        </p>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-8 md:gap-12 min-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-2 md:gap-4 w-full">
        {STEPS.slice(0, 4).map((step, idx) => (
          <div key={step.id} className="flex-1 flex flex-col gap-1.5 md:gap-2">
            <div className={`h-0.5 md:h-1 w-full transition-colors duration-500 ${idx <= currentStep ? 'bg-foreground' : 'bg-secondary'}`} />
            <span className={`text-[9px] md:text-[10px] uppercase tracking-widest ${idx <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center gap-8 md:gap-12">
        {currentStep === 0 && (
          <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 text-center mb-2 md:mb-4">
              <h2 className="text-2xl md:text-4xl font-serif">What materials do you gravitate toward?</h2>
              <p className="text-muted-foreground text-sm">Select all that apply.</p>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
              {MATERIAL_OPTIONS.map(m => {
                const isSelected = selections.materials.includes(m);
                return (
                  <button key={m} onClick={() => toggleSelection('materials', m)}
                    className={`px-4 py-3 md:px-6 md:py-4 border text-xs md:text-sm uppercase tracking-widest transition-all active:scale-95 ${isSelected ? 'border-foreground bg-foreground text-background' : 'border-border/60 hover:border-foreground'}`}
                    data-testid={`button-material-${m.toLowerCase().replace(/\s+/g, '-')}`}
                  >{m}</button>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 text-center mb-2 md:mb-4">
              <h2 className="text-2xl md:text-4xl font-serif">Your typical spend per item</h2>
              <p className="text-muted-foreground text-sm">This helps us recommend brands in your range.</p>
            </div>
            <div className="flex flex-col gap-2 md:gap-3 max-w-md mx-auto w-full">
              {['Under $150', '$150–$300', '$300–$600', '$600–$1,200', 'No limit'].map(option => {
                const isSelected = selections.spend === option;
                return (
                  <button key={option} onClick={() => setSingleSelection('spend', option)}
                    className={`p-4 md:p-6 border text-left flex justify-between items-center transition-all active:scale-[0.98] ${isSelected ? 'border-foreground bg-secondary/50' : 'border-border/60 hover:border-foreground'}`}
                    data-testid={`button-spend-${option.replace(/[^a-zA-Z0-9]/g, '-')}`}
                  >
                    <span className="text-xs md:text-sm uppercase tracking-widest">{option}</span>
                    {isSelected && <Check className="w-4 h-4 md:w-5 md:h-5 text-foreground flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 text-center mb-2 md:mb-4">
              <h2 className="text-2xl md:text-4xl font-serif leading-tight">How much synthetic content are you comfortable with?</h2>
              <p className="text-muted-foreground text-sm">e.g. Elastane, Polyester, Nylon.</p>
            </div>
            <div className="flex flex-col gap-2 md:gap-3 max-w-md mx-auto w-full">
              {['Ideally none (natural only)', 'Up to 10%', 'Up to 25%', 'Up to 40%', 'Depends on the piece'].map(option => {
                const isSelected = selections.syntheticTolerance === option;
                return (
                  <button key={option} onClick={() => setSingleSelection('syntheticTolerance', option)}
                    className={`p-4 md:p-6 border text-left flex justify-between items-center transition-all active:scale-[0.98] ${isSelected ? 'border-foreground bg-secondary/50' : 'border-border/60 hover:border-foreground'}`}
                    data-testid={`button-synthetic-${option.replace(/[^a-zA-Z0-9]/g, '-')}`}
                  >
                    <span className="text-xs md:text-sm uppercase tracking-widest">{option}</span>
                    {isSelected && <Check className="w-4 h-4 md:w-5 md:h-5 text-foreground flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <BrandsStep
            designers={designers}
            selectedBrands={selections.brands}
            onToggle={(name: string) => toggleSelection('brands', name)}
          />
        )}
      </div>

      <div className="flex justify-between items-center border-t border-border/40 pt-6 md:pt-8 mt-auto">
        <button onClick={prevStep} disabled={currentStep === 0}
          className="flex items-center gap-2 text-xs md:text-sm uppercase tracking-widest disabled:opacity-30 transition-opacity active:scale-95 py-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={nextStep} disabled={!canProceed()}
          className="bg-foreground text-background px-6 py-3 md:px-8 md:py-3 text-xs md:text-sm uppercase tracking-widest disabled:opacity-30 flex items-center gap-2 transition-all hover:bg-foreground/90 active:scale-95"
          data-testid="button-next-step">
          {currentStep === 3 ? 'Get Results' : 'Next'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function BrandsStep({ designers, selectedBrands, onToggle }: { designers: any[]; selectedBrands: string[]; onToggle: (name: string) => void }) {
  const [brandSearch, setBrandSearch] = useState("");

  const popularBrands = useMemo(() => {
    const popular = [
      "Hermès", "Brunello Cucinelli", "Loro Piana", "The Row", "Zegna",
      "Max Mara", "Jil Sander", "Bottega Veneta", "Auralee", "Lemaire",
      "Margaret Howell", "Studio Nicholson"
    ];
    const found = popular
      .map(name => (designers as any[]).find((d: any) => d.name === name))
      .filter(Boolean);
    if (found.length >= 6) return found;
    return (designers as any[]).slice(0, 12);
  }, [designers]);

  const searchResults = useMemo(() => {
    if (!brandSearch.trim()) return [];
    const q = brandSearch.toLowerCase().trim();
    const startsWith = (designers as any[])
      .filter((d: any) => d.name.toLowerCase().startsWith(q));
    const contains = (designers as any[])
      .filter((d: any) => !d.name.toLowerCase().startsWith(q) && d.name.toLowerCase().includes(q));
    return [...startsWith, ...contains].slice(0, 12);
  }, [designers, brandSearch]);

  const isSearching = brandSearch.trim().length > 0;

  const selectedNotShown = (list: any[]) => selectedBrands.filter(
    name => !list.some((d: any) => d.name === name)
  );

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 text-center mb-2 md:mb-4">
        <h2 className="text-2xl md:text-4xl font-serif">Select brands you already love</h2>
        <p className="text-muted-foreground text-sm">Optional. Pick from popular brands or search for any brand.</p>
      </div>

      <div className="relative max-w-md mx-auto w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Type to search brands..."
          className="w-full bg-background border border-border/60 pl-12 pr-10 py-3 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 uppercase tracking-widest"
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          data-testid="input-brand-search"
        />
        {brandSearch && (
          <button onClick={() => setBrandSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectedBrands.length > 0 && (
        <div className="flex flex-wrap gap-2 max-w-md mx-auto w-full">
          {selectedBrands.map(name => (
            <button
              key={name}
              onClick={() => onToggle(name)}
              className="flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 text-xs uppercase tracking-widest active:scale-95 transition-all"
              data-testid={`chip-brand-${name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {name} <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {isSearching ? (
        <>
          <div className="flex flex-col gap-1 max-w-lg mx-auto w-full">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              {searchResults.length > 0 ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${brandSearch}"` : ''}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-h-[40vh] overflow-y-auto scrollbar-hide">
              {searchResults.map((brand: any) => {
                const isSelected = selectedBrands.includes(brand.name);
                return (
                  <button key={brand.id} onClick={() => onToggle(brand.name)}
                    className={`p-3 md:p-4 border text-left flex items-center justify-between gap-3 transition-all active:scale-[0.98] ${isSelected ? 'border-foreground bg-foreground text-background' : 'border-border/60 hover:border-foreground'}`}
                    data-testid={`button-brand-${brand.slug}`}
                  >
                    <span className="font-serif text-sm md:text-base truncate">{brand.name}</span>
                    {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
          {searchResults.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">No brands found matching "{brandSearch}"</p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3 max-w-lg mx-auto w-full">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Popular Brands</span>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {popularBrands.map((brand: any) => {
              const isSelected = selectedBrands.includes(brand.name);
              return (
                <button key={brand.id} onClick={() => onToggle(brand.name)}
                  className={`p-3 md:p-4 border text-left flex items-center justify-between gap-2 transition-all active:scale-[0.98] ${isSelected ? 'border-foreground bg-foreground text-background' : 'border-border/60 hover:border-foreground'}`}
                  data-testid={`button-brand-${brand.slug}`}
                >
                  <span className="font-serif text-xs md:text-sm truncate">{brand.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          {selectedNotShown(popularBrands).map(name => {
            const brand = (designers as any[]).find((d: any) => d.name === name);
            if (!brand) return null;
            return (
              <button key={brand.id} onClick={() => onToggle(brand.name)}
                className="p-3 md:p-4 border text-left flex items-center justify-between gap-3 transition-all active:scale-[0.98] border-foreground bg-foreground text-background"
                data-testid={`button-brand-selected-${brand.slug}`}
              >
                <span className="font-serif text-xs md:text-sm truncate">{brand.name}</span>
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuizResults({ selections, recommendation, designers }: { selections: any; recommendation: any; designers: any[] }) {
  const { isAuthenticated } = useAuth();
  const recommendedDesigners = designers
    .filter((d: any) => d.naturalFiberPercent == null || d.naturalFiberPercent > 85)
    .slice(0, 3);

  return (
    <div className="py-6 md:py-16 max-w-4xl mx-auto w-full flex flex-col gap-10 md:gap-16 animate-in fade-in duration-700">
      <header className="text-center flex flex-col gap-4 md:gap-6 px-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Your Profile</span>
        <h1 className="text-3xl md:text-6xl font-serif">{recommendation.profileType}</h1>
        <p className="text-base md:text-lg text-foreground/80 max-w-2xl mx-auto font-light">
          {recommendation.recommendation}
        </p>
      </header>

      {!isAuthenticated && (
        <div className="bg-foreground text-background p-6 md:p-8 flex flex-col md:flex-row items-center gap-4 md:gap-8 justify-between" data-testid="banner-save-results">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <span className="text-sm md:text-base font-serif">Save your results</span>
            <span className="text-xs text-background/70">Create an account to keep your profile, track favorites, and get personalized recommendations.</span>
          </div>
          <Link href="/account" className="border border-background px-6 py-3 uppercase tracking-widest text-[10px] md:text-xs hover:bg-background hover:text-foreground transition-colors active:scale-95 whitespace-nowrap flex-shrink-0" data-testid="link-create-account-save">
            Create Account
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 border-y border-border/40 py-8 md:py-12">
        <div className="flex flex-col gap-4 md:gap-6">
          <h2 className="text-xl md:text-2xl font-serif">Explore These Categories</h2>
          <ul className="flex flex-col gap-2 md:gap-3">
            {(recommendation.suggestedDesignerTypes || []).map((t: string, i: number) => (
              <li key={i} className="flex items-center gap-3 text-muted-foreground text-sm">
                <span className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-foreground text-background text-[10px] md:text-xs font-medium flex-shrink-0">{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 md:gap-4 bg-secondary/30 p-4 md:p-6">
          <span className="text-xs uppercase tracking-widest text-muted-foreground mb-1 md:mb-2">Your Preferences</span>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-sm">Price Range</span>
            <span className="font-serif text-sm">{selections.spend}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-sm">Synthetic Limit</span>
            <span className="font-serif text-sm">{selections.syntheticTolerance}</span>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <span className="text-sm">Core Materials</span>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {(recommendation.recommendedMaterials || selections.materials).map((m: string) => (
                <span key={m} className="px-2 py-1 bg-background text-[10px] md:text-xs uppercase tracking-widest">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl md:text-3xl font-serif">Recommended for You</h2>
          <p className="text-muted-foreground text-sm">Designers matching your material standards.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-8">
          {recommendedDesigners.map((designer: any) => (
            <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-3 md:gap-4" data-testid={`card-recommended-${designer.slug}`}>
                <div className="aspect-[3/4] bg-secondary relative flex items-center justify-center">
                  <span className="font-serif text-4xl md:text-5xl text-muted-foreground/30">{designer.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-serif">{designer.name}</h3>
                  {designer.naturalFiberPercent != null && (
                    <p className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mt-1">
                      {designer.naturalFiberPercent}% Natural Fibers
                    </p>
                  )}
                </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="flex justify-center pt-4 md:pt-8">
        <Link href={isAuthenticated ? "/account" : "/designers"} className="border border-foreground px-6 py-3 md:px-8 md:py-4 uppercase tracking-widest text-xs md:text-sm hover:bg-foreground hover:text-background transition-colors active:scale-95">
            {isAuthenticated ? "View Your Account" : "Browse Designers"}
        </Link>
      </div>
    </div>
  );
}
