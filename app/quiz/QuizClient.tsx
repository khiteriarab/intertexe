"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Loader2, X, Check } from "lucide-react";

type Step = "welcome" | "materials" | "priceRange" | "syntheticTolerance" | "favoriteBrands" | "loading" | "result";

const STEPS: Step[] = ["welcome", "materials", "priceRange", "syntheticTolerance", "favoriteBrands", "loading", "result"];

const MATERIAL_OPTIONS = ["Cotton", "Linen", "Silk", "Wool", "Cashmere"];

const PRICE_OPTIONS = [
  { label: "Accessible", range: "$50–150" },
  { label: "Mid-Range", range: "$150–400" },
  { label: "Premium", range: "$400–800" },
  { label: "Luxury", range: "$800+" },
];

const SYNTHETIC_OPTIONS = [
  { label: "Zero Tolerance", description: "No synthetics at all" },
  { label: "Minimal", description: "Up to 10% acceptable" },
  { label: "Moderate", description: "Up to 25% acceptable" },
  { label: "Flexible", description: "Depends on the piece" },
];

const STEP_LABELS = [
  { id: "materials", title: "Materials" },
  { id: "priceRange", title: "Budget" },
  { id: "syntheticTolerance", title: "Synthetics" },
  { id: "favoriteBrands", title: "Brands" },
];

export default function QuizClient() {
  const [step, setStep] = useState<Step>("welcome");
  const [materials, setMaterials] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState("");
  const [syntheticTolerance, setSyntheticTolerance] = useState("");
  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState("");
  const [result, setResult] = useState<{ profileType: string; recommendation: string } | null>(null);
  const [error, setError] = useState("");

  const stepIndex = STEPS.indexOf(step);
  const quizStepIndex = stepIndex - 1;

  const toggleMaterial = (m: string) => {
    setMaterials((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const addBrand = () => {
    const trimmed = brandInput.trim();
    if (trimmed && !favoriteBrands.includes(trimmed)) {
      setFavoriteBrands((prev) => [...prev, trimmed]);
    }
    setBrandInput("");
  };

  const removeBrand = (brand: string) => {
    setFavoriteBrands((prev) => prev.filter((b) => b !== brand));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBrand();
    }
  };

  const canProceed = () => {
    switch (step) {
      case "materials":
        return materials.length > 0;
      case "priceRange":
        return priceRange !== "";
      case "syntheticTolerance":
        return syntheticTolerance !== "";
      case "favoriteBrands":
        return true;
      default:
        return true;
    }
  };

  const goNext = async () => {
    if (step === "favoriteBrands") {
      setStep("loading");
      try {
        const recRes = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materials, priceRange, syntheticTolerance, favoriteBrands }),
        });
        if (!recRes.ok) throw new Error("Recommendation failed");
        const recData = await recRes.json();

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("intertexe_auth_token");
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
        }

        await fetch("/api/quiz", {
          method: "POST",
          headers,
          body: JSON.stringify({
            materials,
            priceRange,
            syntheticTolerance,
            favoriteBrands,
            profileType: recData.profileType,
            recommendation: recData.recommendation,
          }),
        }).catch(() => {});

        setResult({
          profileType: recData.profileType || "Your Fabric Persona",
          recommendation: recData.recommendation || "Your personalized recommendation is ready.",
        });
        setStep("result");
      } catch {
        setError("Something went wrong. Please try again.");
        setStep("favoriteBrands");
      }
    } else {
      const idx = STEPS.indexOf(step);
      setStep(STEPS[idx + 1]);
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  if (step === "welcome") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 md:py-32 text-center px-4" data-testid="quiz-welcome">
        <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
          Discover Your Style
        </span>
        <h1 className="text-3xl md:text-5xl font-serif mb-4" data-testid="text-quiz-title">
          Find Your Fabric Persona
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-md mb-10 leading-relaxed">
          Answer a few questions about your material preferences and we&apos;ll match you with your ideal fabric persona and designer recommendations.
        </p>
        <button
          onClick={() => setStep("materials")}
          className="bg-foreground text-background px-8 py-4 uppercase tracking-[0.2em] text-xs md:text-sm flex items-center gap-2 hover:bg-foreground/90 transition-colors active:scale-95"
          data-testid="button-start-quiz"
        >
          Start Quiz <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center px-4" data-testid="quiz-loading">
        <Loader2 className="w-10 h-10 animate-spin text-foreground/40" />
        <h2 className="text-2xl md:text-3xl font-serif">Curating Your Profile</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Analyzing your preferences to find your fabric persona...
        </p>
      </div>
    );
  }

  if (step === "result" && result) {
    return (
      <div className="py-12 md:py-20 max-w-2xl mx-auto w-full flex flex-col items-center gap-8 md:gap-12 text-center px-4 animate-in fade-in duration-700" data-testid="quiz-result">
        <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Your Fabric Persona
        </span>
        <h1 className="text-3xl md:text-5xl font-serif" data-testid="text-persona-name">
          {result.profileType}
        </h1>
        <p className="text-foreground/80 text-base md:text-lg leading-relaxed max-w-xl" data-testid="text-recommendation">
          {result.recommendation}
        </p>
        <div className="flex flex-col gap-3 md:gap-4 bg-secondary/30 p-5 md:p-8 w-full text-left">
          <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Your Preferences
          </span>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-sm">Materials</span>
            <span className="font-serif text-sm">{materials.join(", ")}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-sm">Budget</span>
            <span className="font-serif text-sm">{priceRange}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-sm">Synthetic Tolerance</span>
            <span className="font-serif text-sm">{syntheticTolerance}</span>
          </div>
          {favoriteBrands.length > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">Brands</span>
              <span className="font-serif text-sm">{favoriteBrands.join(", ")}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            href="/shop"
            className="bg-foreground text-background px-8 py-4 uppercase tracking-[0.2em] text-xs md:text-sm hover:bg-foreground/90 transition-colors active:scale-95 text-center flex items-center justify-center gap-2"
            data-testid="link-start-shopping"
          >
            Start Shopping
          </Link>
          <Link
            href="/designers"
            className="border border-foreground px-8 py-4 uppercase tracking-[0.2em] text-xs md:text-sm hover:bg-foreground hover:text-background transition-colors active:scale-95 text-center"
            data-testid="link-browse-designers"
          >
            Browse Designers
          </Link>
        </div>
        <button
          onClick={() => {
            setStep("welcome");
            setMaterials([]);
            setPriceRange("");
            setSyntheticTolerance("");
            setFavoriteBrands([]);
            setResult(null);
          }}
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-retake-quiz"
        >
          Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-8 md:gap-12 min-h-[calc(100vh-8rem)] px-4">
      <div className="flex items-center gap-2 md:gap-4 w-full">
        {STEP_LABELS.map((s, idx) => (
          <div key={s.id} className="flex-1 flex flex-col gap-1.5 md:gap-2">
            <div
              className={`h-0.5 md:h-1 w-full transition-colors duration-500 ${
                idx <= quizStepIndex ? "bg-foreground" : "bg-secondary"
              }`}
            />
            <span
              className={`text-[9px] md:text-[10px] uppercase tracking-[0.2em] ${
                idx <= quizStepIndex ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.title}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center gap-8 md:gap-12">
        {step === "materials" && (
          <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 text-center mb-2 md:mb-4">
              <h2 className="text-2xl md:text-4xl font-serif">What materials do you gravitate toward?</h2>
              <p className="text-muted-foreground text-sm">Select all that apply.</p>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
              {MATERIAL_OPTIONS.map((m) => {
                const isSelected = materials.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleMaterial(m)}
                    className={`px-4 py-3 md:px-6 md:py-4 border text-xs md:text-sm uppercase tracking-[0.2em] transition-all active:scale-95 ${
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/60 hover:border-foreground"
                    }`}
                    data-testid={`button-material-${m.toLowerCase()}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "priceRange" && (
          <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 text-center mb-2 md:mb-4">
              <h2 className="text-2xl md:text-4xl font-serif">Your typical spend per item</h2>
              <p className="text-muted-foreground text-sm">This helps us recommend brands in your range.</p>
            </div>
            <div className="flex flex-col gap-2 md:gap-3 max-w-md mx-auto w-full">
              {PRICE_OPTIONS.map((option) => {
                const value = `${option.label} (${option.range})`;
                const isSelected = priceRange === value;
                return (
                  <button
                    key={option.label}
                    onClick={() => setPriceRange(value)}
                    className={`p-4 md:p-6 border text-left flex justify-between items-center transition-all active:scale-[0.98] ${
                      isSelected
                        ? "border-foreground bg-secondary/50"
                        : "border-border/60 hover:border-foreground"
                    }`}
                    data-testid={`button-price-${option.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs md:text-sm uppercase tracking-[0.2em]">{option.label}</span>
                      <span className="text-[10px] md:text-xs text-muted-foreground">{option.range}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 md:w-5 md:h-5 text-foreground flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "syntheticTolerance" && (
          <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 text-center mb-2 md:mb-4">
              <h2 className="text-2xl md:text-4xl font-serif leading-tight">How strict are you about synthetics?</h2>
              <p className="text-muted-foreground text-sm">e.g. Elastane, Polyester, Nylon.</p>
            </div>
            <div className="flex flex-col gap-2 md:gap-3 max-w-md mx-auto w-full">
              {SYNTHETIC_OPTIONS.map((option) => {
                const isSelected = syntheticTolerance === option.label;
                return (
                  <button
                    key={option.label}
                    onClick={() => setSyntheticTolerance(option.label)}
                    className={`p-4 md:p-6 border text-left flex justify-between items-center transition-all active:scale-[0.98] ${
                      isSelected
                        ? "border-foreground bg-secondary/50"
                        : "border-border/60 hover:border-foreground"
                    }`}
                    data-testid={`button-synthetic-${option.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs md:text-sm uppercase tracking-[0.2em]">{option.label}</span>
                      <span className="text-[10px] md:text-xs text-muted-foreground">{option.description}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 md:w-5 md:h-5 text-foreground flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "favoriteBrands" && (
          <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 text-center mb-2 md:mb-4">
              <h2 className="text-2xl md:text-4xl font-serif">Any favorite brands?</h2>
              <p className="text-muted-foreground text-sm">Optional. Type a brand name and press Enter to add.</p>
            </div>
            <div className="max-w-md mx-auto w-full flex flex-col gap-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={brandInput}
                  onChange={(e) => setBrandInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a brand name..."
                  className="flex-1 bg-background border border-border/60 px-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 uppercase tracking-[0.2em]"
                  data-testid="input-brand"
                />
                <button
                  onClick={addBrand}
                  disabled={!brandInput.trim()}
                  className="bg-foreground text-background px-4 py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-30 transition-opacity hover:bg-foreground/90 active:scale-95"
                  data-testid="button-add-brand"
                >
                  Add
                </button>
              </div>
              {favoriteBrands.length > 0 && (
                <div className="flex flex-wrap gap-2" data-testid="brand-tags">
                  {favoriteBrands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => removeBrand(brand)}
                      className="flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 text-xs uppercase tracking-[0.2em] active:scale-95 transition-all"
                      data-testid={`tag-brand-${brand.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {brand} <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center" data-testid="text-error">{error}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center border-t border-border/40 pt-6 md:pt-8 mt-auto">
        <button
          onClick={goBack}
          disabled={step === "materials"}
          className="flex items-center gap-2 text-xs md:text-sm uppercase tracking-[0.2em] disabled:opacity-30 transition-opacity active:scale-95 py-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={goNext}
          disabled={!canProceed()}
          className="bg-foreground text-background px-6 py-3 md:px-8 md:py-3 text-xs md:text-sm uppercase tracking-[0.2em] disabled:opacity-30 flex items-center gap-2 transition-all hover:bg-foreground/90 active:scale-95"
          data-testid="button-next-step"
        >
          {step === "favoriteBrands" ? "Get Results" : "Next"} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
