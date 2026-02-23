import { useState, useMemo, Component, type ReactNode } from "react";
import { Link } from "wouter";
import { Check, ArrowRight, ArrowLeft, Loader2, Search, X, ShoppingBag, ExternalLink, CheckCircle2, SlidersHorizontal, Star } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fetchDesigners, fetchDesignersByNames, fetchAllProducts, fetchProductsByBrand } from "@/lib/supabase";
import { getAllProfiles, getTierLabel, type BrandProfile } from "@/lib/brand-profiles";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { getBrandHeroImage } from "@/lib/brand-hero-images";
import { BrandImage } from "@/components/BrandImage";

const POPULAR_BRAND_NAMES = [
  "FRAME", "RE/DONE", "Reformation", "Ganni", "Isabel Marant",
  "KHAITE", "Zimmermann", "Jacquemus", "TOTEME", "Anine Bing",
  "Nanushka", "STAUD", "Ulla Johnson", "Max Mara",
  "The Row", "Vince", "Reiss", "Theory", "Acne Studios", "Sandro",
  "Maje", "AllSaints", "Club Monaco"
];
import { useAuth } from "@/hooks/use-auth";
import { assignPersona } from "@shared/personas";

class QuizErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("QuizResults render error:", error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}


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

  const { data: designers = [], isLoading: designersLoading } = useQuery({
    queryKey: ["designers-quiz-popular"],
    queryFn: () => fetchDesignersByNames(POPULAR_BRAND_NAMES),
    staleTime: 10 * 60 * 1000,
  });

  const [selections, setSelections] = useState({
    materials: [] as string[],
    spend: "",
    syntheticTolerance: "",
    brands: [] as string[]
  });

  const { isAuthenticated } = useAuth();

  const handleResults = (data: any) => {
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
  };

  const getClientPersona = () => {
    const persona = assignPersona({
      materials: selections.materials,
      syntheticTolerance: selections.syntheticTolerance,
    });
    return {
      profileType: persona.name,
      personaId: persona.id,
      recommendation: persona.description,
      coreValue: persona.coreValue,
      buysFor: persona.buysFor,
      suggestedDesignerTypes: persona.suggestedDesignerTypes,
      recommendedMaterials: persona.recommendedMaterials,
    };
  };

  const recommendMutation = useMutation({
    mutationFn: async () => {
      try {
        const result = await api.getRecommendation({
          materials: selections.materials,
          priceRange: selections.spend,
          syntheticTolerance: selections.syntheticTolerance,
          favoriteBrands: selections.brands,
        });
        return result;
      } catch {
        return getClientPersona();
      }
    },
    onSuccess: (data) => handleResults(data),
    onError: () => handleResults(getClientPersona()),
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
    const errorFallback = (
      <div className="py-16 max-w-2xl mx-auto text-center flex flex-col gap-6 px-4">
        <h1 className="text-3xl font-serif">{recommendation.profileType || "Your Fabric Persona"}</h1>
        <p className="text-foreground/80">{recommendation.recommendation || "Your results are ready."}</p>
        <Link href="/designers" className="border border-foreground px-8 py-4 uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors">
          Browse All Designers
        </Link>
      </div>
    );
    return (
      <QuizErrorBoundary fallback={errorFallback}>
        <QuizResults selections={selections} recommendation={recommendation} designers={designers} />
      </QuizErrorBoundary>
    );
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
            designersLoading={designersLoading}
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

function BrandsStep({ designers, designersLoading, selectedBrands, onToggle }: { designers: any[]; designersLoading: boolean; selectedBrands: string[]; onToggle: (name: string) => void }) {
  const [brandSearch, setBrandSearch] = useState("");

  const { data: searchedDesigners = [] } = useQuery({
    queryKey: ["designers-search", brandSearch],
    queryFn: () => fetchDesigners(brandSearch, 20),
    enabled: brandSearch.trim().length >= 2,
    staleTime: 60 * 1000,
  });

  const popularBrands = useMemo(() => {
    if (designers.length === 0) return [];
    const order = POPULAR_BRAND_NAMES.map(n => n.toLowerCase());
    return [...designers].sort((a: any, b: any) => {
      const ai = order.indexOf(a.name.toLowerCase());
      const bi = order.indexOf(b.name.toLowerCase());
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [designers]);

  const searchResults = useMemo(() => {
    if (!brandSearch.trim()) return [];
    if (searchedDesigners.length > 0) return searchedDesigners.slice(0, 12);
    const q = brandSearch.toLowerCase().trim();
    const allBrands = designers as any[];
    const startsWith = allBrands.filter((d: any) => d.name.toLowerCase().startsWith(q));
    const contains = allBrands.filter((d: any) => !d.name.toLowerCase().startsWith(q) && d.name.toLowerCase().includes(q));
    return [...startsWith, ...contains].slice(0, 12);
  }, [designers, searchedDesigners, brandSearch]);

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

      {designersLoading && !isSearching && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest">Loading brands...</span>
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

const MATERIAL_TERMS: Record<string, string[]> = {
  "Cotton": ["cotton"],
  "Silk": ["silk"],
  "Linen": ["linen", "flax"],
  "Wool": ["wool", "merino"],
  "Cashmere": ["cashmere"],
  "Leather / Suede": ["leather", "suede"],
  "Tencel / Modal": ["tencel", "modal"],
  "Denim": ["denim"],
  "Alpaca": ["alpaca"],
  "Viscose / Rayon": ["viscose", "rayon"],
  "Velvet": ["velvet"],
  "Satin": ["satin"],
};

const RELIABLE_PRODUCT_SLUGS = new Set([
  "frame", "anine-bing", "khaite", "sandro", "agolde", "reformation", "toteme",
  "nanushka", "acne-studios", "tibi", "ulla-johnson", "veronica-beard", "rails",
  "mara-hoffman", "faithfull-the-brand", "rebecca-taylor", "mother-denim",
  "citizens-of-humanity", "re-done", "dl1961", "veda", "stine-goya",
]);

function QuizProductCard({ product }: { product: any }) {
  const imageUrl = product.imageUrl || product.image_url;
  const brandName = product.brandName || product.brand_name || "";
  const fiberPercent = product.naturalFiberPercent || product.natural_fiber_percent;
  const shopUrl = product.url
    ? `/leaving?url=${encodeURIComponent(product.url)}&brand=${encodeURIComponent(brandName)}`
    : null;
  const CardWrapper = shopUrl ? 'a' : 'div';
  const wrapperProps = shopUrl ? { href: shopUrl } : {};
  return (
    <CardWrapper {...wrapperProps} className="group flex flex-col bg-background border border-border/40 hover:border-foreground/30 transition-all cursor-pointer" data-testid={`card-quiz-product-${product.productId || product.product_id}`}>
      <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          loading="lazy"
        />
        {fiberPercent != null && fiberPercent >= 90 && (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-1 bg-emerald-900/90 text-white px-2 py-0.5 text-[8px] uppercase tracking-wider backdrop-blur-sm">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {fiberPercent}% natural
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-3 flex-1">
        <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{brandName}</span>
        <h3 className="text-[13px] leading-snug line-clamp-2 font-medium">{product.name}</h3>
        {product.composition && (
          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-auto">{product.composition}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          {product.price && <span className="text-xs font-medium">{product.price}</span>}
          {fiberPercent != null && fiberPercent < 90 && (
            <span className="text-[9px] text-muted-foreground">{fiberPercent}% natural</span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 bg-foreground text-background py-3 text-[10px] uppercase tracking-[0.2em] group-hover:bg-foreground/90 transition-colors">
        Shop Now <ExternalLink className="w-3 h-3" />
      </div>
    </CardWrapper>
  );
}

function QuizResults({ selections, recommendation, designers }: { selections: any; recommendation: any; designers: any[] }) {
  const { isAuthenticated } = useAuth();
  const selectedBrandNames: string[] = selections.brands || [];
  const selectedMaterials: string[] = selections.materials || [];
  const spendRange: string = selections.spend || "";

  const selectedBrandSlugs = useMemo(() => {
    return selectedBrandNames.map(name => {
      const match = designers.find((d: any) => d.name === name);
      return match ? match.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    });
  }, [selectedBrandNames, designers]);

  const { data: brandProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["quiz-brand-products", selectedBrandSlugs],
    queryFn: async () => {
      if (selectedBrandSlugs.length === 0) return [];
      const results = await Promise.all(
        selectedBrandSlugs.map(slug => fetchProductsByBrand(slug))
      );
      return results
        .flat()
        .filter((p: any) => p.imageUrl || p.image_url)
        .sort((a: any, b: any) => (b.naturalFiberPercent || 0) - (a.naturalFiberPercent || 0));
    },
    enabled: selectedBrandSlugs.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const { data: allProducts = [], isLoading: allProductsLoading } = useQuery({
    queryKey: ["all-products-quiz"],
    queryFn: fetchAllProducts,
    staleTime: 10 * 60 * 1000,
  });

  const selectedDesigners = useMemo(() => {
    return selectedBrandNames
      .map(name => designers.find((d: any) => d.name === name))
      .filter(Boolean);
  }, [selectedBrandNames, designers]);

  const brandProductsWithImages = brandProducts.filter((p: any) => p.imageUrl || p.image_url);

  const searchTerms = useMemo(() => {
    return selectedMaterials.flatMap(m => MATERIAL_TERMS[m] || [m.toLowerCase()]);
  }, [selectedMaterials]);

  const recommendedProducts = useMemo(() => {
    const selectedSlugsSet = new Set(selectedBrandSlugs);
    const filtered = (allProducts as any[])
      .filter((p: any) => {
        if (!(p.imageUrl || p.image_url)) return false;
        const slug = p.brandSlug || p.brand_slug;
        if (selectedSlugsSet.has(slug)) return false;
        if (searchTerms.length === 0) return true;
        const comp = (p.composition || "").toLowerCase();
        return searchTerms.some(t => comp.includes(t));
      });

    filtered.sort((a: any, b: any) => {
      const aSlug = a.brandSlug || a.brand_slug;
      const bSlug = b.brandSlug || b.brand_slug;
      const aReliable = RELIABLE_PRODUCT_SLUGS.has(aSlug) ? 1 : 0;
      const bReliable = RELIABLE_PRODUCT_SLUGS.has(bSlug) ? 1 : 0;
      if (bReliable !== aReliable) return bReliable - aReliable;
      return (b.naturalFiberPercent || 0) - (a.naturalFiberPercent || 0);
    });

    const seen = new Set<string>();
    const diversified: any[] = [];
    const brandCounts: Record<string, number> = {};
    for (const p of filtered) {
      const slug = p.brandSlug || p.brand_slug;
      const count = brandCounts[slug] || 0;
      if (count >= 4) continue;
      brandCounts[slug] = count + 1;
      const pid = p.productId || p.product_id;
      if (seen.has(pid)) continue;
      seen.add(pid);
      diversified.push(p);
      if (diversified.length >= 12) break;
    }
    return diversified;
  }, [allProducts, selectedBrandSlugs, searchTerms]);

  const recommendedBrands = useMemo(() => {
    const profiles = getAllProfiles();
    const selectedSlugsSet = new Set(selectedBrandSlugs);
    const userMaterialsLower = selectedMaterials.map(m => m.toLowerCase().replace(/\s*\/\s*/g, ''));

    return profiles
      .filter(p => !selectedSlugsSet.has(p.slug) && getBrandHeroImage(p.name) !== null)
      .map(profile => {
        let score = 0;
        const profileMatsLower = profile.materialStrengths.map(m => m.toLowerCase());
        userMaterialsLower.forEach(um => {
          if (profileMatsLower.some(pm => pm.includes(um) || um.includes(pm))) score += 3;
        });
        score += Math.floor(profile.naturalFiberEstimate / 10);
        if (profile.tier === "aspirational") score += 2;
        else if (profile.tier === "material-strong") score += 1;
        return { profile, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(r => r.profile);
  }, [selectedBrandSlugs, selectedMaterials]);

  const [showAllSelected, setShowAllSelected] = useState(false);
  const displaySelectedProducts = showAllSelected ? brandProductsWithImages : brandProductsWithImages.slice(0, 6);
  const [showAllRecommended, setShowAllRecommended] = useState(false);
  const displayRecommendedProducts = showAllRecommended ? recommendedProducts : recommendedProducts.slice(0, 6);
  const isLoadingProducts = productsLoading || allProductsLoading;

  return (
    <div className="py-6 md:py-16 max-w-4xl mx-auto w-full flex flex-col gap-10 md:gap-16 animate-in fade-in duration-700">
      <header className="text-center flex flex-col gap-4 md:gap-6 px-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Your Fabric Persona</span>
        <h1 className="text-3xl md:text-6xl font-serif" data-testid="text-persona-name">{recommendation.profileType}</h1>
        {recommendation.coreValue && (
          <p className="text-sm md:text-base uppercase tracking-[0.2em] text-muted-foreground italic font-serif">
            "{recommendation.coreValue}"
          </p>
        )}
        <p className="text-base md:text-lg text-foreground/80 max-w-2xl mx-auto font-light leading-relaxed">
          {recommendation.recommendation}
        </p>
      </header>

      {!isAuthenticated && (
        <div className="bg-foreground text-background p-5 md:p-8 flex flex-col md:flex-row items-center gap-4 md:gap-8 justify-between" data-testid="banner-save-results">
          <div className="flex flex-col gap-1.5 text-center md:text-left">
            <span className="text-sm md:text-base font-serif">Save your results</span>
            <span className="text-xs text-background/70 leading-relaxed">Create an account to keep your fabric persona and get personalized recommendations.</span>
          </div>
          <Link href="/account" className="border border-background px-6 py-3.5 md:py-3 uppercase tracking-[0.15em] text-[10px] md:text-xs hover:bg-background hover:text-foreground transition-colors active:scale-[0.97] whitespace-nowrap flex-shrink-0 w-full md:w-auto text-center" data-testid="link-create-account-save">
            Create Account
          </Link>
        </div>
      )}

      {brandProductsWithImages.length > 0 && (
        <section className="flex flex-col gap-6 md:gap-8" data-testid="section-selected-products">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl md:text-3xl font-serif">From {selectedBrandNames.join(' & ')}</h2>
            <p className="text-muted-foreground text-sm">
              {brandProductsWithImages.length} verified pieces from your selected {selectedBrandNames.length === 1 ? 'brand' : 'brands'}. Every item meets our natural fiber threshold.
            </p>
          </div>
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col">
                  <div className="aspect-[3/4] bg-secondary" />
                  <div className="p-3 flex flex-col gap-2">
                    <div className="h-3 bg-secondary w-1/2" />
                    <div className="h-4 bg-secondary w-3/4" />
                    <div className="h-3 bg-secondary w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {displaySelectedProducts.map((product: any) => (
                  <QuizProductCard key={product.productId || product.product_id} product={product} />
                ))}
              </div>
              {!showAllSelected && brandProductsWithImages.length > 6 && (
                <button
                  onClick={() => setShowAllSelected(true)}
                  className="flex items-center justify-center gap-2 w-full border border-foreground/20 hover:border-foreground/40 py-3.5 uppercase tracking-[0.15em] text-[10px] md:text-xs transition-colors active:scale-[0.98]"
                  data-testid="button-show-more-selected"
                >
                  Show All {brandProductsWithImages.length} Pieces <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </section>
      )}

      <section className="flex flex-col gap-6 md:gap-8" data-testid="section-recommended-products">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-foreground/60" />
            <h2 className="text-2xl md:text-3xl font-serif">Recommended For You</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            {selectedMaterials.length > 0
              ? `Top-scoring ${selectedMaterials.slice(0, 3).join(', ').toLowerCase()} pieces from brands that match your material standards.`
              : `Our highest-rated pieces from brands that match your preferences.`}
          </p>
        </div>
        {allProductsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col">
                <div className="aspect-[3/4] bg-secondary" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 bg-secondary w-1/2" />
                  <div className="h-4 bg-secondary w-3/4" />
                  <div className="h-3 bg-secondary w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : recommendedProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {displayRecommendedProducts.map((product: any) => (
                <QuizProductCard key={product.productId || product.product_id} product={product} />
              ))}
            </div>
            {!showAllRecommended && recommendedProducts.length > 6 && (
              <button
                onClick={() => setShowAllRecommended(true)}
                className="flex items-center justify-center gap-2 w-full border border-foreground/20 hover:border-foreground/40 py-3.5 uppercase tracking-[0.15em] text-[10px] md:text-xs transition-colors active:scale-[0.98]"
                data-testid="button-show-more-recommended"
              >
                Show All {recommendedProducts.length} Recommendations <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <Link
            href="/shop"
            className="flex items-center justify-center gap-3 w-full bg-foreground text-background px-8 py-4 md:py-5 uppercase tracking-[0.2em] text-xs md:text-sm hover:bg-foreground/90 transition-colors active:scale-[0.98]"
            data-testid="link-shop-verified"
          >
            <ShoppingBag className="w-4 h-4" />
            Shop All Verified Products
          </Link>
        )}
      </section>

      {recommendedBrands.length > 0 && (
        <section className="flex flex-col gap-6 md:gap-8 border-t border-border/40 pt-10 md:pt-14" data-testid="section-recommended-brands">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl md:text-2xl font-serif">Brands We'd Recommend</h2>
            <p className="text-muted-foreground text-sm">
              Based on your love of {selectedMaterials.slice(0, 2).join(' and ').toLowerCase() || 'natural fibers'} — these brands excel in the materials you care about.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {recommendedBrands.map((profile) => {
              const score = getCuratedScore(profile.name);
              return (
                <Link key={profile.slug} href={`/designers/${profile.slug}`} className="group flex flex-col border border-border/20 hover:border-border/50 transition-all" data-testid={`card-recommended-${profile.slug}`}>
                  <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                    <BrandImage name={profile.name} className="absolute inset-0 w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1.5">
                      <h3 className="text-sm md:text-base font-serif text-white leading-tight">{profile.name}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 bg-white/20 text-white backdrop-blur-sm">
                          {getTierLabel(profile.tier)}
                        </span>
                        {score != null && (
                          <span className="text-[8px] text-white/70">{score}% natural</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 flex flex-col gap-1.5">
                    <div className="flex flex-wrap gap-1">
                      {profile.materialStrengths.slice(0, 3).map(mat => (
                        <span key={mat} className={`text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 ${
                          selectedMaterials.some(sm => mat.toLowerCase().includes(sm.toLowerCase().split(' ')[0]))
                            ? 'bg-foreground text-background font-medium'
                            : 'bg-secondary text-foreground/60'
                        }`}>{mat}</span>
                      ))}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{profile.priceRange}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {selectedDesigners.length > 0 && (
        <section className="flex flex-col gap-6 md:gap-8 border-t border-border/40 pt-10 md:pt-14" data-testid="section-your-designers">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl md:text-2xl font-serif">Your Selected Brands</h2>
            <p className="text-muted-foreground text-sm">
              Explore the full quality verdicts for the brands you chose.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {selectedDesigners.map((designer: any) => {
              const score = getCuratedScore(designer.name);
              const tierLabel = score != null
                ? score >= 90 ? 'Exceptional' : score >= 70 ? 'Excellent' : 'Good'
                : null;
              return (
                <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col border border-border/20 hover:border-border/50 transition-all" data-testid={`card-selected-${designer.slug}`}>
                  <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                    <BrandImage name={designer.name} className="absolute inset-0 w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 z-10">
                      <h3 className="text-sm md:text-base font-serif text-white leading-tight drop-shadow-lg">{designer.name}</h3>
                    </div>
                    {tierLabel && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className={`text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 ${
                          tierLabel === 'Exceptional' ? 'bg-foreground text-background' :
                          tierLabel === 'Excellent' ? 'bg-foreground/80 text-background' :
                          'bg-foreground/10 text-foreground/60'
                        }`}>{tierLabel}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 md:p-3 flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">View Quality Verdict</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 border-y border-border/40 py-8 md:py-12">
        <div className="flex flex-col gap-6 md:gap-8">
          {recommendation.buysFor && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">You Buy For</span>
              <p className="text-lg md:text-xl font-serif">{recommendation.buysFor}</p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Explore These Categories</span>
            <ul className="flex flex-col gap-2 md:gap-3">
              {(recommendation.suggestedDesignerTypes || []).map((t: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-foreground/80 text-sm">
                  <span className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-foreground text-background text-[10px] md:text-xs font-medium flex-shrink-0">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
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
            <span className="text-sm">Your Materials</span>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {(recommendation.recommendedMaterials || selections.materials).map((m: string) => (
                <span key={m} className="px-2 py-1 bg-background text-[10px] md:text-xs uppercase tracking-widest">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4 md:pt-8">
        <Link href="/shop" className="bg-foreground text-background px-6 py-3 md:px-8 md:py-4 uppercase tracking-widest text-xs md:text-sm hover:bg-foreground/90 transition-colors active:scale-95 text-center flex items-center justify-center gap-2" data-testid="link-start-shopping">
          <ShoppingBag className="w-3.5 h-3.5" /> Start Shopping
        </Link>
        <Link href="/designers" className="border border-foreground px-6 py-3 md:px-8 md:py-4 uppercase tracking-widest text-xs md:text-sm hover:bg-foreground hover:text-background transition-colors active:scale-95 text-center" data-testid="link-browse-designers">
          Browse All Designers
        </Link>
      </div>
    </div>
  );
}
