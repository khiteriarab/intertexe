import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Link2, Loader2, ArrowRight, Leaf, ShoppingBag, ChevronLeft, X, Scan, Sparkles, ExternalLink, MessageCircle } from "lucide-react";
import { Link as RouterLink } from "wouter";
import { trackAffiliateRedirect, trackScanStart, trackScanComplete, trackScanError } from "@/lib/analytics";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import { Heart } from "lucide-react";

type ScanResult = {
  tagInfo: { brandName: string; productName: string; price: string; composition?: string; confidence: string; rawText: string };
  products: any[];
  matched: boolean;
  brandStats: { avgFiber: number; rating: string; productCount: number } | null;
  designerInfo: { name: string; slug: string; logo_url: string; website: string; description: string; rating: string; hasProducts: boolean } | null;
  webIntel: { composition: string; naturalFiberPercent: number | null; priceRange: string; otherRetailers: string[]; qualityNotes: string; sustainabilityNotes: string | null; verdict: string } | null;
  betterAlternatives: any[];
};

function ratingColor(rating: string) {
  switch (rating) {
    case "Exceptional": return "bg-emerald-900 text-emerald-100";
    case "Excellent": return "bg-emerald-800 text-emerald-100";
    case "Good": return "bg-amber-800 text-amber-100";
    case "Caution": return "bg-red-900 text-red-100";
    default: return "bg-neutral-800 text-neutral-200";
  }
}

function ratingBorderColor(rating: string) {
  switch (rating) {
    case "Exceptional": return "border-emerald-600";
    case "Excellent": return "border-emerald-500";
    case "Good": return "border-amber-500";
    case "Caution": return "border-red-500";
    default: return "border-neutral-400";
  }
}

function ProductCard({ product }: { product: any }) {
  const { toggle, isFavorited } = useProductFavorites();
  const productId = String(product.id);
  const saved = isFavorited(productId);
  const name = product.name || product.productName || "";
  const brandName = product.brand_name || product.brandName || "";
  const imageUrl = product.image_url || product.imageUrl;
  const price = product.price;
  const composition = product.composition;
  const shopUrl = product.url;
  const naturalFiber = product.natural_fiber_percent;

  return (
    <a href={shopUrl || "#"} target="_blank" rel="noopener noreferrer" onClick={() => shopUrl && trackAffiliateRedirect(brandName, shopUrl)} className="group flex flex-col" data-testid={`product-scan-${product.id}`}>
      <div className="aspect-[3/4] bg-[#f0f0ee] relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-neutral-300" /></div>
        )}
        {composition && (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent pt-6 pb-2 px-2">
            <span className="text-[8px] md:text-[9px] text-white/90 uppercase tracking-[0.04em] font-medium line-clamp-1">{composition}</span>
          </div>
        )}
        {naturalFiber != null && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-emerald-800/90 text-white px-1.5 py-0.5 text-[8px] font-medium backdrop-blur-sm">{naturalFiber}%</span>
          </div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId, brandName, price); }}
          className={`absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center transition-opacity duration-200 ${saved ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          aria-label={saved ? "Remove from favorites" : "Save to favorites"}
        >
          <Heart className={`w-4 h-4 drop-shadow-sm ${saved ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>
      </div>
      <div className="flex flex-col gap-0.5 pt-2.5">
        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em]">{brandName}</span>
        <h3 className="text-[11px] md:text-[12px] leading-snug line-clamp-2 text-muted-foreground">{name}</h3>
        {price && <span className="text-[11px] md:text-[12px] mt-0.5 font-medium">{price}</span>}
      </div>
    </a>
  );
}

function FiberBar({ percent, label }: { percent: number; label?: string }) {
  const color = percent >= 90 ? "bg-emerald-600" : percent >= 70 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label || "Natural Fiber"}</span>
        <span className="text-xs font-medium">{percent}%</span>
      </div>
      <div className="w-full h-1.5 bg-neutral-100 overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

const DEMO_RESULT: ScanResult = {
  tagInfo: { brandName: "Zara", productName: "Satin Effect Midi Dress", price: "$89.90", composition: "92% Polyester, 8% Elastane", confidence: "high", rawText: "From zara.com" },
  products: [],
  matched: false,
  brandStats: null,
  designerInfo: null,
  webIntel: {
    composition: "92% Polyester, 8% Elastane",
    naturalFiberPercent: 0,
    priceRange: "$30 - $150",
    otherRetailers: ["Zara.com", "ASOS", "Zalando", "About You"],
    qualityNotes: "Zara's satin-effect dresses use synthetic polyester with an elastane blend for stretch. The fabric mimics silk's sheen but lacks the breathability and longevity of natural fibers. Typical fast-fashion construction with limited durability.",
    sustainabilityNotes: "Polyester is petroleum-derived and non-biodegradable. Zara has made some sustainability pledges through their Join Life program, but this particular product uses no natural or recycled fibers.",
    verdict: "At $89.90 for a 100% synthetic dress, you're paying for trend speed, not material quality. Consider silk or viscose alternatives from brands like Reformation or Sandro for similar aesthetics with better fabric."
  },
  betterAlternatives: [
    { id: "demo-1", brand_name: "Reformation", name: "Nikita Silk Midi Dress", price: "$278", composition: "100% Silk", natural_fiber_percent: 100, image_url: null, url: "https://www.thereformation.com" },
    { id: "demo-2", brand_name: "Sandro", name: "Satin Dress with Open Back", price: "$395", composition: "95% Silk, 5% Elastane", natural_fiber_percent: 95, image_url: null, url: "https://www.sandro-paris.com" },
    { id: "demo-3", brand_name: "A.L.C.", name: "Harlow Silk Charmeuse Midi Dress", price: "$495", composition: "100% Silk", natural_fiber_percent: 100, image_url: null, url: "https://www.alcltd.com" },
    { id: "demo-4", brand_name: "Vince", name: "Slip Dress in Silk Satin", price: "$325", composition: "92% Silk, 8% Spandex", natural_fiber_percent: 92, image_url: null, url: "https://www.vince.com" },
  ],
};

function EmailGate({ onUnlock, onClose }: { onUnlock: () => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setErr("Please enter a valid email"); return; }
    setSubmitting(true);
    setErr("");
    try {
      await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: crypto.randomUUID().slice(0, 12) }),
      });
      localStorage.setItem("intertexe_scanner_email", email.trim());
      onUnlock();
    } catch {
      localStorage.setItem("intertexe_scanner_email", email.trim());
      onUnlock();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" data-testid="email-gate-overlay">
      <div className="bg-[#FAFAF8] w-full max-w-md p-8 md:p-10 flex flex-col items-center text-center relative">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground transition-colors" data-testid="button-gate-close">
          <X className="w-4 h-4" />
        </button>
        <Sparkles className="w-6 h-6 text-neutral-400 mb-4" />
        <h2 className="text-xl md:text-2xl font-serif mb-2">Unlock Shopping Intelligence</h2>
        <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed max-w-xs">
          Enter your email to scan products, check compositions, and get AI-powered material advice — free.
        </p>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="w-full px-4 py-3 text-[14px] border border-neutral-200 bg-white focus:outline-none focus:border-neutral-400 placeholder:text-neutral-300"
            autoFocus
            data-testid="input-gate-email"
          />
          {err && <p className="text-[12px] text-red-500">{err}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#111] text-white text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
            data-testid="button-gate-submit"
          >
            {submitting ? "..." : "Get Free Access"}
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground/50 mt-4">No spam. Unsubscribe anytime.</p>
      </div>
    </div>
  );
}

export default function Scanner() {
  const [mode, setMode] = useState<"idle" | "camera">("idle");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const hasAccess = () => !!localStorage.getItem("intertexe_scanner_email");

  const requireEmail = (action: () => void) => {
    if (hasAccess()) { action(); return; }
    setPendingAction(() => action);
    setShowEmailGate(true);
  };

  const handleEmailUnlock = () => {
    setShowEmailGate(false);
    if (pendingAction) { pendingAction(); setPendingAction(null); }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setMode("camera");
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setError("Camera access denied. Try uploading a photo instead.");
      setMode("idle");
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    stopCamera();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setMode("idle");
    await scanImage(dataUrl);
  }, [stopCamera]);

  const scanImage = async (base64: string, mode: "camera" | "upload" = "camera") => {
    setLoading(true);
    setError("");
    setResult(null);
    trackScanStart(mode);
    try {
      const res = await fetch("/api/scan-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
      trackScanComplete(data.tagInfo?.brandName || "unknown", mode, data.matched);
    } catch (err: any) {
      setError(err.message || "Failed to scan. Try again.");
      trackScanError(mode, err.message || "scan_failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await scanImage(base64, "upload");
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const scanUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    trackScanStart("url");
    try {
      const res = await fetch("/api/scan-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
      trackScanComplete(data.tagInfo?.brandName || "unknown", "url", data.matched);
    } catch (err: any) {
      setError(err.message || "Failed to analyze. Try again.");
      trackScanError("url", err.message || "scan_failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    stopCamera();
    setResult(null);
    setError("");
    setUrl("");
    setMode("idle");
    setLoading(false);
  };

  if (mode === "camera") {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <button onClick={() => { stopCamera(); setMode("idle"); }} className="text-white/80 p-1" data-testid="button-close-camera">
            <X className="w-6 h-6" />
          </button>
          <span className="text-white/60 text-xs uppercase tracking-widest">Scan Tag</span>
          <div className="w-6" />
        </div>
        <video ref={videoRef} className="flex-1 object-cover" playsInline autoPlay muted />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-40 md:w-80 md:h-52 border-2 border-white/30 relative">
            <div className="absolute -top-px -left-px w-6 h-6 border-t-2 border-l-2 border-white" />
            <div className="absolute -top-px -right-px w-6 h-6 border-t-2 border-r-2 border-white" />
            <div className="absolute -bottom-px -left-px w-6 h-6 border-b-2 border-l-2 border-white" />
            <div className="absolute -bottom-px -right-px w-6 h-6 border-b-2 border-r-2 border-white" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">
          <p className="text-white/50 text-[11px] tracking-wide">Align the tag within the frame</p>
          <button onClick={capturePhoto} className="w-[68px] h-[68px] rounded-full border-[3px] border-white/80 flex items-center justify-center active:scale-95 transition-transform" data-testid="button-capture">
            <div className="w-[56px] h-[56px] rounded-full bg-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {showEmailGate && <EmailGate onUnlock={handleEmailUnlock} onClose={() => { setShowEmailGate(false); setPendingAction(null); }} />}
      {!result && !loading && (
        <>
          <div className="pt-8 md:pt-14 pb-6 md:pb-8">
            <h1 className="text-2xl md:text-[40px] font-serif leading-tight mb-2" data-testid="text-scanner-title">Shopping Intelligence</h1>
            <p className="text-[12px] md:text-sm text-muted-foreground">Scan a tag, upload a photo, or paste a product URL.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            <button onClick={() => requireEmail(startCamera)} className="col-span-1 group flex flex-col items-center gap-2 p-5 md:p-7 bg-[#111] text-white hover:bg-neutral-900 transition-all active:scale-[0.98]" data-testid="button-camera-scan">
              <Camera className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.12em]">Scan Tag</span>
            </button>

            <button onClick={() => requireEmail(() => fileInputRef.current?.click())} className="col-span-1 group flex flex-col items-center gap-2 p-5 md:p-7 bg-white border border-neutral-200 hover:border-neutral-400 transition-all active:scale-[0.98]" data-testid="button-upload-photo">
              <Upload className="w-5 h-5 md:w-6 md:h-6 text-neutral-600" />
              <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.12em]">Upload</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} data-testid="input-file-upload" />

            <div className="col-span-2 md:col-span-1 bg-white border border-neutral-200 p-4 md:p-5 flex flex-col">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste product URL..."
                  className="flex-1 min-w-0 px-3 py-2.5 text-[13px] border border-neutral-200 bg-[#FAFAF8] focus:outline-none focus:border-neutral-400 placeholder:text-neutral-300"
                  onKeyDown={(e) => e.key === "Enter" && requireEmail(scanUrl)}
                  data-testid="input-product-url"
                />
                <button onClick={() => requireEmail(scanUrl)} disabled={!url.trim()} className="px-4 py-2.5 bg-[#111] text-white text-[10px] uppercase tracking-[0.15em] font-medium disabled:opacity-30 hover:bg-neutral-800 transition-colors flex-shrink-0" data-testid="button-scan-url">
                  Scan
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm mb-6" data-testid="text-scan-error">{error}</div>
          )}

          <RouterLink href="/chat" className="flex items-center gap-3 p-4 bg-[#111] text-white hover:bg-neutral-900 transition-colors active:scale-[0.98]" data-testid="link-chat-from-scanner">
            <MessageCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.12em]">Ask Our AI Advisor</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/40 ml-auto flex-shrink-0" />
          </RouterLink>
        </>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 md:py-40 gap-5">
          <div className="relative">
            <div className="w-16 h-16 border border-neutral-200 flex items-center justify-center">
              <Scan className="w-6 h-6 text-neutral-300 animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium mb-1">Analyzing product</p>
            <p className="text-[11px] text-muted-foreground">Searching 17,000+ verified products</p>
          </div>
        </div>
      )}

      {result && (() => {
        const fiberPct = result.webIntel?.naturalFiberPercent ?? null;
        const isGreatProduct = fiberPct !== null && fiberPct >= 80;
        const hasProducts = result.products.length > 0 || result.betterAlternatives.length > 0;

        return (
        <div className="pt-6 md:pt-10 pb-8">
          <button onClick={reset} className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors mb-6" data-testid="button-scan-again">
            <ChevronLeft className="w-3.5 h-3.5" /> New scan
          </button>

          <div className="flex items-start gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-3xl font-serif mb-0.5" data-testid="text-result-brand">{result.tagInfo.brandName}</h2>
              {result.tagInfo.productName && <p className="text-[13px] text-muted-foreground truncate" data-testid="text-result-product">{result.tagInfo.productName}</p>}
            </div>
            {result.tagInfo.price && <span className="text-lg font-medium flex-shrink-0" data-testid="text-result-price">{result.tagInfo.price}</span>}
          </div>

          {result.webIntel && (
            <div className={`p-4 mb-6 flex items-center gap-3 ${isGreatProduct ? "bg-emerald-50 border border-emerald-200" : fiberPct !== null && fiberPct < 50 ? "bg-amber-50 border border-amber-200" : "bg-neutral-50 border border-neutral-200"}`}>
              {result.webIntel.composition && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-0.5">{result.webIntel.composition}</p>
                  <p className={`text-[11px] ${isGreatProduct ? "text-emerald-700" : fiberPct !== null && fiberPct < 50 ? "text-amber-700" : "text-muted-foreground"}`}>
                    {isGreatProduct ? "Great choice — this is a high natural fiber product" : fiberPct !== null && fiberPct < 50 ? "Low natural fiber content — consider alternatives below" : result.webIntel.verdict || ""}
                  </p>
                </div>
              )}
              {fiberPct !== null && (
                <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center border-2 border-current rounded-none" style={{ color: isGreatProduct ? "#15803d" : fiberPct < 50 ? "#b45309" : "#525252" }}>
                  <span className="text-base font-bold">{fiberPct}%</span>
                </div>
              )}
            </div>
          )}

          {result.designerInfo && (
            <RouterLink href={`/designers/${result.designerInfo.slug}`} className="flex items-center justify-between p-3 bg-white border border-neutral-200 mb-6 hover:border-neutral-400 transition-colors" data-testid="link-brand-page">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-serif font-bold">{result.designerInfo.name.charAt(0)}</span>
                </div>
                <span className="text-[12px] font-medium truncate">{result.designerInfo.name}</span>
                {result.brandStats && (
                  <span className={`px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium ${ratingColor(result.brandStats.rating)}`} data-testid="text-brand-rating">
                    {result.brandStats.rating}
                  </span>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                View brand <ArrowRight className="w-3 h-3" />
              </span>
            </RouterLink>
          )}

          {result.betterAlternatives.length > 0 && (
            <div className="mb-8">
              <div className="mb-4">
                <p className="text-sm font-medium">{isGreatProduct ? "Similar Pieces to Shop" : "Better Alternatives"}</p>
                <p className="text-[11px] text-muted-foreground">{isGreatProduct ? "High natural fiber products you might also like" : "Same category, higher natural fiber content"}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {result.betterAlternatives.map((p: any) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}

          {result.products.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium">{isGreatProduct ? `More from ${result.tagInfo.brandName}` : `Verified ${result.tagInfo.brandName} Products`}</p>
                </div>
                {result.designerInfo?.slug && (
                  <RouterLink href={`/designers/${result.designerInfo.slug}`} className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </RouterLink>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {result.products.slice(0, 8).map((p: any) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}

          {result.webIntel && (result.webIntel.qualityNotes || result.webIntel.sustainabilityNotes || result.webIntel.otherRetailers?.length) && (
            <div className="border-t border-neutral-100 pt-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-3 h-3 text-neutral-300" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">More Details</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.webIntel.verdict && !isGreatProduct && (
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Verdict</p>
                    <p className="text-[13px] leading-relaxed">{result.webIntel.verdict}</p>
                  </div>
                )}
                {result.webIntel.qualityNotes && (
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Quality</p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{result.webIntel.qualityNotes}</p>
                  </div>
                )}
                {result.webIntel.otherRetailers && result.webIntel.otherRetailers.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1.5">Also Available At</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.webIntel.otherRetailers.map((r: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-neutral-50 border border-neutral-100">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.webIntel.sustainabilityNotes && (
                  <div className="flex items-start gap-2">
                    <Leaf className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{result.webIntel.sustainabilityNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <RouterLink href="/chat" className="flex items-center gap-3 p-4 bg-[#111] text-white hover:bg-neutral-900 transition-colors active:scale-[0.98]" data-testid="link-chat-from-results">
            <MessageCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.12em]">Ask Our AI Advisor</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/40 ml-auto flex-shrink-0" />
          </RouterLink>
        </div>);
      })()}
    </div>
  );
}
