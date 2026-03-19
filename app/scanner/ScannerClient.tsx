'use client';

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Loader2, ArrowRight, Leaf, ShoppingBag, ChevronLeft, X, Scan, Sparkles, MessageCircle, Heart, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useProductFavorites } from "../hooks/use-product-favorites";
import { trackScanStart, trackScanComplete, trackScanError } from "../../lib/analytics";

type FiberEntry = { fiber: string; percent: number; isNatural: boolean };

type ScanResult = {
  tagInfo: { brandName: string; productName: string; price: string; composition: string; garmentType?: string; size?: string; madeIn?: string; careInstructions?: string; confidence: string; rawText: string };
  fiberBreakdown: FiberEntry[];
  naturalPercent: number;
  isNatural: boolean;
  verdict: string;
  category: string;
  products: any[];
  matched: boolean;
  brandStats: { avgFiber: number; rating: string; productCount: number } | null;
  designerInfo: { name: string; slug: string; logo_url: string; website: string; description: string; rating: string; hasProducts: boolean } | null;
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

function NaturalScoreRing({ percent }: { percent: number }) {
  const size = 80;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 80 ? "#15803d" : percent >= 50 ? "#b45309" : "#dc2626";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e5e5" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="butt"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{percent}%</span>
        <span className="text-[7px] uppercase tracking-[0.1em] text-muted-foreground">natural</span>
      </div>
    </div>
  );
}

function FiberBreakdownBar({ fibers }: { fibers: FiberEntry[] }) {
  if (!fibers.length) return null;
  const sorted = [...fibers].sort((a, b) => b.percent - a.percent);

  return (
    <div className="space-y-2">
      {sorted.map((f, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-20 text-[11px] capitalize text-right font-medium">{f.fiber}</div>
          <div className="flex-1 h-2 bg-neutral-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${f.isNatural ? "bg-emerald-600" : "bg-neutral-400"}`}
              style={{ width: `${f.percent}%` }}
            />
          </div>
          <div className="w-10 text-[11px] text-muted-foreground">{f.percent}%</div>
          {f.isNatural ? (
            <Leaf className="w-3 h-3 text-emerald-600 flex-shrink-0" />
          ) : (
            <div className="w-3 h-3 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
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
  const naturalFiber = product.natural_fiber_percent;

  return (
    <Link href={`/product/${product.id}`} className="group flex flex-col" data-testid={`product-scan-${product.id}`}>
      <div className="aspect-[3/4] bg-[#f0f0ee] relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-neutral-300" /></div>
        )}
        {naturalFiber != null && (
          <div className="absolute top-2 left-2 z-10">
            <span className="flex items-center gap-1 bg-emerald-900/90 text-white px-1.5 py-0.5 text-[8px] font-medium backdrop-blur-sm">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {naturalFiber}%
            </span>
          </div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId, brandName, price); }}
          className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
          data-testid={`btn-favorite-scan-${product.id}`}
          aria-label={saved ? "Remove from favorites" : "Save to favorites"}
        >
          <Heart className={`w-4 h-4 transition-colors ${saved ? "fill-red-500 text-red-500" : "text-foreground/60 hover:text-foreground"}`} />
        </button>
      </div>
      <div className="flex flex-col gap-0.5 pt-2.5">
        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em]">{brandName}</span>
        <h3 className="text-[11px] md:text-[12px] leading-snug truncate text-muted-foreground">{name}</h3>
        {price && <span className="text-[11px] md:text-[12px] mt-0.5 font-medium">{price}</span>}
      </div>
    </Link>
  );
}

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
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="w-full px-4 py-3 text-[14px] border border-neutral-200 bg-white focus:outline-none focus:border-neutral-400 placeholder:text-neutral-300"
            autoFocus data-testid="input-gate-email"
          />
          {err && <p className="text-[12px] text-red-500">{err}</p>}
          <button type="submit" disabled={submitting}
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

export default function ScannerClient() {
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

  const scanImage = async (base64: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    trackScanStart("upload");
    try {
      const res = await fetch("/api/scan-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
      trackScanComplete(data.tagInfo?.brandName || "unknown", "upload", data.matched);
    } catch (err: any) {
      setError(err.message || "Failed to scan. Try again.");
      trackScanError("upload", err.message || "Scan failed");
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
      await scanImage(base64);
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
      if (data.tagInfo) {
        setResult(data);
        trackScanComplete(data.tagInfo?.brandName || "unknown", "url", data.matched);
      } else if (!res.ok) {
        throw new Error(data.error || "Scan failed");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      try {
        const hostname = new URL(url.trim()).hostname.replace("www.", "");
        const brandGuess = hostname.split(".")[0].replace(/-store$|-shop$|-official$/i, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        setResult({
          tagInfo: { brandName: brandGuess, productName: "", price: "", composition: "", garmentType: "", size: "", madeIn: "", careInstructions: "", confidence: "low", rawText: url.trim() },
          fiberBreakdown: [], naturalPercent: 0, isNatural: false,
          verdict: `We couldn't fetch product details, but browse ${brandGuess}'s natural-fiber options below.`,
          category: "", products: [], matched: false, brandStats: null, designerInfo: null, betterAlternatives: [],
        });
      } catch {
        setError("Could not analyze this URL. Please check the link and try again.");
      }
      trackScanError("url", err.message || "Scan failed");
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
            <p className="text-[12px] md:text-sm text-muted-foreground">Photograph any clothing tag — composition label, hanging tag, or both — and we'll tell you exactly what it's made of.</p>
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
                  type="url" value={url} onChange={(e) => setUrl(e.target.value)}
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

          <Link href="/chat" className="flex items-center gap-3 p-4 bg-[#111] text-white hover:bg-neutral-900 transition-colors active:scale-[0.98] mb-8" data-testid="link-chat-from-scanner">
            <MessageCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.12em]">Ask Our AI Advisor</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/40 ml-auto flex-shrink-0" />
          </Link>
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
            <p className="text-sm font-medium mb-1">Reading your tag</p>
            <p className="text-[11px] text-muted-foreground">Analyzing composition & finding alternatives</p>
          </div>
        </div>
      )}

      {result && (() => {
        const pct = result.naturalPercent;
        const isGreat = pct >= 70;

        return (
          <div className="pt-6 md:pt-10 pb-8">
            <button onClick={reset} className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors mb-6" data-testid="button-scan-again">
              <ChevronLeft className="w-3.5 h-3.5" /> New scan
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-3xl font-serif mb-0.5" data-testid="text-result-brand">{result.tagInfo.brandName}</h2>
                {result.tagInfo.productName && <p className="text-[13px] text-muted-foreground truncate" data-testid="text-result-product">{result.tagInfo.productName}</p>}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {result.tagInfo.price && <span className="text-sm font-medium" data-testid="text-result-price">{result.tagInfo.price}</span>}
                  {result.tagInfo.garmentType && (
                    <span className="text-[10px] px-2 py-0.5 bg-neutral-100 border border-neutral-200 uppercase tracking-[0.08em]">{result.tagInfo.garmentType}</span>
                  )}
                  {result.tagInfo.size && (
                    <span className="text-[10px] px-2 py-0.5 bg-neutral-100 border border-neutral-200 uppercase tracking-[0.08em]">Size {result.tagInfo.size}</span>
                  )}
                </div>
              </div>
              <NaturalScoreRing percent={pct} />
            </div>

            <div className={`p-4 md:p-5 mb-6 ${isGreat ? "bg-emerald-50 border border-emerald-200" : pct > 0 ? "bg-amber-50 border border-amber-200" : "bg-neutral-50 border border-neutral-200"}`}>
              <div className="flex items-start gap-3">
                {isGreat ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                ) : pct > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                ) : (
                  <Sparkles className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-sm font-medium mb-0.5 ${isGreat ? "text-emerald-900" : pct > 0 ? "text-amber-900" : "text-neutral-800"}`}>
                    {isGreat
                      ? (result.tagInfo.confidence === "brand-average" ? "Brand Catalog Estimate"
                        : result.tagInfo.confidence === "inferred" ? "Natural Material Detected"
                        : "Natural Fiber Verified")
                      : pct > 0 ? "Low Natural Fiber Content" : "Explore Natural Alternatives"}
                  </p>
                  <p className={`text-[12px] leading-relaxed ${isGreat ? "text-emerald-700" : pct > 0 ? "text-amber-700" : "text-muted-foreground"}`} data-testid="text-verdict">
                    {result.verdict}
                  </p>
                </div>
              </div>
            </div>

            {result.tagInfo.composition && (
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">Composition</p>
                <p className="text-[13px] mb-4" data-testid="text-result-composition">{result.tagInfo.composition}</p>
                {result.fiberBreakdown.length > 0 && (
                  <FiberBreakdownBar fibers={result.fiberBreakdown} />
                )}
              </div>
            )}

            {(result.tagInfo.madeIn || result.tagInfo.careInstructions) && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {result.tagInfo.madeIn && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Made In</p>
                    <p className="text-[13px]">{result.tagInfo.madeIn}</p>
                  </div>
                )}
                {result.tagInfo.careInstructions && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Care</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{result.tagInfo.careInstructions}</p>
                  </div>
                )}
              </div>
            )}

            {result.designerInfo && (
              <Link href={`/designers/${result.designerInfo.slug}`} className="flex items-center justify-between p-3 bg-white border border-neutral-200 mb-6 hover:border-neutral-400 transition-colors" data-testid="link-brand-page">
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
              </Link>
            )}

            {result.brandStats && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3 bg-neutral-50 border border-neutral-200">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Avg Fiber</p>
                  <p className="text-lg font-medium" data-testid="text-brand-avg-fiber">{result.brandStats.avgFiber}%</p>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Rating</p>
                  <p className="text-sm font-medium" data-testid="text-brand-rating-detail">{result.brandStats.rating}</p>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Products</p>
                  <p className="text-lg font-medium" data-testid="text-brand-product-count">{result.brandStats.productCount}</p>
                </div>
              </div>
            )}

            {result.betterAlternatives.length > 0 && (
              <div className="mb-8">
                <div className="mb-4">
                  <p className="text-sm font-medium">
                    {isGreat ? "Similar Natural Fiber Pieces" : "Natural Fiber Alternatives"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isGreat
                      ? "Shop similar pieces made with natural fibers from verified brands"
                      : "Same category, verified natural fiber content from brands in our database"}
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {result.betterAlternatives.slice(0, 8).map((p: any) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}

            {result.products.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium">More from {result.tagInfo.brandName}</p>
                  {result.designerInfo?.slug && (
                    <Link href={`/designers/${result.designerInfo.slug}`} className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                      View all <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {result.products.slice(0, 8).map((p: any) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}

            <Link href="/chat" className="flex items-center gap-3 p-4 bg-[#111] text-white hover:bg-neutral-900 transition-colors active:scale-[0.98] mb-8" data-testid="link-chat-from-results">
              <MessageCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.12em]">Ask Our AI About This Material</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/40 ml-auto flex-shrink-0" />
            </Link>
          </div>
        );
      })()}
    </div>
  );
}
