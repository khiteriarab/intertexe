import { useState } from "react";
import { Link } from "wouter";
import { Check, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
    queryFn: () => api.getDesigners(),
  });

  const [selections, setSelections] = useState({
    materials: [] as string[],
    spend: "",
    syntheticTolerance: "",
    brands: [] as string[]
  });

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
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => api.submitQuiz({
      materials: selections.materials,
      priceRange: selections.spend,
      syntheticTolerance: selections.syntheticTolerance,
      favoriteBrands: selections.brands,
    }),
  });

  const nextStep = () => {
    if (currentStep === STEPS.length - 2) {
      recommendMutation.mutate();
      saveMutation.mutate();
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8 max-w-md mx-auto text-center">
        <Loader2 className="w-12 h-12 animate-spin text-foreground/40" />
        <h2 className="text-3xl font-serif">Curating Your Profile</h2>
        <p className="text-muted-foreground">
          Our AI is analyzing your preferences to find designers that match your material standards...
        </p>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-12">
      <div className="flex items-center justify-between gap-4 w-full">
        {STEPS.slice(0, 4).map((step, idx) => (
          <div key={step.id} className="flex-1 flex flex-col gap-2">
            <div className={`h-1 w-full transition-colors duration-500 ${idx <= currentStep ? 'bg-foreground' : 'bg-secondary'}`} />
            <span className={`text-[10px] uppercase tracking-widest hidden sm:block ${idx <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-[50vh] flex flex-col justify-center gap-12">
        {currentStep === 0 && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 text-center mb-4">
              <h2 className="text-4xl font-serif">What materials do you gravitate toward?</h2>
              <p className="text-muted-foreground">Select all that apply.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {MATERIAL_OPTIONS.map(m => {
                const isSelected = selections.materials.includes(m);
                return (
                  <button key={m} onClick={() => toggleSelection('materials', m)}
                    className={`px-6 py-4 border text-sm uppercase tracking-widest transition-all ${isSelected ? 'border-foreground bg-foreground text-background' : 'border-border/60 hover:border-foreground'}`}
                    data-testid={`button-material-${m.toLowerCase().replace(/\s+/g, '-')}`}
                  >{m}</button>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 text-center mb-4">
              <h2 className="text-4xl font-serif">Your typical spend per item</h2>
              <p className="text-muted-foreground">This helps us recommend brands in your range.</p>
            </div>
            <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
              {['Under $150', '$150–$300', '$300–$600', '$600–$1,200', 'No limit'].map(option => {
                const isSelected = selections.spend === option;
                return (
                  <button key={option} onClick={() => setSingleSelection('spend', option)}
                    className={`p-6 border text-left flex justify-between items-center transition-all ${isSelected ? 'border-foreground bg-secondary/50' : 'border-border/60 hover:border-foreground'}`}
                    data-testid={`button-spend-${option.replace(/[^a-zA-Z0-9]/g, '-')}`}
                  >
                    <span className="text-sm uppercase tracking-widest">{option}</span>
                    {isSelected && <Check className="w-5 h-5 text-foreground" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 text-center mb-4">
              <h2 className="text-4xl font-serif">How much synthetic content are you comfortable with?</h2>
              <p className="text-muted-foreground">e.g. Elastane, Polyester, Nylon.</p>
            </div>
            <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
              {['Ideally none (natural only)', 'Up to 10%', 'Up to 25%', 'Up to 40%', 'Depends on the piece'].map(option => {
                const isSelected = selections.syntheticTolerance === option;
                return (
                  <button key={option} onClick={() => setSingleSelection('syntheticTolerance', option)}
                    className={`p-6 border text-left flex justify-between items-center transition-all ${isSelected ? 'border-foreground bg-secondary/50' : 'border-border/60 hover:border-foreground'}`}
                    data-testid={`button-synthetic-${option.replace(/[^a-zA-Z0-9]/g, '-')}`}
                  >
                    <span className="text-sm uppercase tracking-widest">{option}</span>
                    {isSelected && <Check className="w-5 h-5 text-foreground" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 text-center mb-4">
              <h2 className="text-4xl font-serif">Select brands you already love</h2>
              <p className="text-muted-foreground">Optional, but helps refine our recommendations.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(designers as any[]).map((brand: any) => {
                const isSelected = selections.brands.includes(brand.name);
                return (
                  <button key={brand.id} onClick={() => toggleSelection('brands', brand.name)}
                    className={`p-4 border text-center transition-all ${isSelected ? 'border-foreground bg-foreground text-background' : 'border-border/60 hover:border-foreground'}`}
                    data-testid={`button-brand-${brand.slug}`}
                  >
                    <span className="font-serif text-lg">{brand.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center border-t border-border/40 pt-8 mt-auto">
        <button onClick={prevStep} disabled={currentStep === 0}
          className="flex items-center gap-2 text-sm uppercase tracking-widest disabled:opacity-30 transition-opacity">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={nextStep} disabled={!canProceed()}
          className="bg-foreground text-background px-8 py-3 text-sm uppercase tracking-widest disabled:opacity-30 flex items-center gap-2 transition-all hover:bg-foreground/90"
          data-testid="button-next-step">
          {currentStep === 3 ? 'Get Results' : 'Next'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function QuizResults({ selections, recommendation, designers }: { selections: any; recommendation: any; designers: any[] }) {
  const recommendedDesigners = designers.filter((d: any) => d.naturalFiberPercent > 85).slice(0, 3);

  return (
    <div className="py-8 md:py-16 max-w-4xl mx-auto w-full flex flex-col gap-16 animate-in fade-in duration-700">
      <header className="text-center flex flex-col gap-6">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Your Profile</span>
        <h1 className="text-4xl md:text-6xl font-serif">{recommendation.profileType}</h1>
        <p className="text-lg text-foreground/80 max-w-2xl mx-auto font-light">
          {recommendation.recommendation}
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-12 border-y border-border/40 py-12">
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-serif">Explore These Categories</h2>
          <ul className="flex flex-col gap-3">
            {(recommendation.suggestedDesignerTypes || []).map((t: string, i: number) => (
              <li key={i} className="flex items-center gap-3 text-muted-foreground">
                <span className="w-6 h-6 flex items-center justify-center bg-foreground text-background text-xs font-medium">{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4 bg-secondary/30 p-6">
          <span className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Your Preferences</span>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-sm">Price Range</span>
            <span className="font-serif">{selections.spend}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-sm">Synthetic Limit</span>
            <span className="font-serif">{selections.syntheticTolerance}</span>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <span className="text-sm">Core Materials</span>
            <div className="flex flex-wrap gap-2">
              {(recommendation.recommendedMaterials || selections.materials).map((m: string) => (
                <span key={m} className="px-2 py-1 bg-background text-xs uppercase tracking-widest">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-serif">Recommended for You</h2>
          <p className="text-muted-foreground">Designers matching your material standards.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {recommendedDesigners.map((designer: any) => (
            <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-4" data-testid={`card-recommended-${designer.slug}`}>
                <div className="aspect-[3/4] bg-secondary relative flex items-center justify-center">
                  <span className="font-serif text-5xl text-muted-foreground/30">{designer.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-xl font-serif">{designer.name}</h3>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                    {designer.naturalFiberPercent}% Natural Fibers
                  </p>
                </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="flex justify-center pt-8">
        <Link href="/account" className="border border-foreground px-8 py-4 uppercase tracking-widest text-sm hover:bg-foreground hover:text-background transition-colors">
            View Your Account
        </Link>
      </div>
    </div>
  );
}
