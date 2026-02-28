import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Link, Loader2, ArrowRight, Star, Leaf, ShoppingBag, ExternalLink, ChevronLeft, X } from "lucide-react";
import { Link as RouterLink } from "wouter";

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

function ProductCard({ product }: { product: any }) {
  const name = product.name || product.productName || "";
  const brandName = product.brand_name || product.brandName || "";
  const imageUrl = product.image_url || product.imageUrl;
  const price = product.price;
  const composition = product.composition;
  const shopUrl = product.url;

  return (
    <a href={shopUrl || "#"} target="_blank" rel="noopener noreferrer" className="group flex flex-col" data-testid={`product-scan-${product.id}`}>
      <div className="aspect-[3/4] bg-[#f5f5f5] relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-neutral-300" /></div>
        )}
        {composition && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] md:text-[9px] uppercase tracking-[0.05em] font-medium backdrop-blur-sm line-clamp-1 max-w-[140px] md:max-w-[200px]">{composition}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 pt-2.5">
        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em]">{brandName}</span>
        <h3 className="text-[11px] md:text-[12px] leading-snug line-clamp-2 text-muted-foreground">{name}</h3>
        {price && <span className="text-[11px] md:text-[12px] mt-0.5">{price}</span>}
      </div>
    </a>
  );
}

export default function Scanner() {
  const [mode, setMode] = useState<"idle" | "camera" | "upload" | "url">("idle");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    try {
      const res = await fetch("/api/scan-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to scan. Try again.");
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
  };

  const scanUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/scan-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze. Try again.");
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
        <div className="absolute top-4 left-4 z-10">
          <button onClick={() => { stopCamera(); setMode("idle"); }} className="bg-black/50 text-white p-2 backdrop-blur-sm" data-testid="button-close-camera">
            <X className="w-5 h-5" />
          </button>
        </div>
        <video ref={videoRef} className="flex-1 object-cover" playsInline autoPlay muted />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button onClick={capturePhoto} className="w-16 h-16 bg-white border-4 border-white/50 rounded-full flex items-center justify-center" data-testid="button-capture">
            <div className="w-12 h-12 bg-white rounded-full border-2 border-neutral-300" />
          </button>
        </div>
        <p className="absolute bottom-28 left-0 right-0 text-center text-white/70 text-xs">Point at a clothing tag or price label</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-24 md:pt-12 md:pb-16">
        {!result && !loading && (
          <>
            <div className="mb-10">
              <h1 className="text-2xl md:text-4xl font-serif mb-3" data-testid="text-scanner-title">Shopping Intelligence</h1>
              <p className="text-sm md:text-base text-muted-foreground">Scan a tag, upload a photo, or paste a product link. We'll tell you what it's really made of.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-8">
              <button onClick={startCamera} className="flex items-center gap-4 p-5 bg-white border border-neutral-200 hover:border-neutral-400 transition-colors text-left" data-testid="button-camera-scan">
                <div className="w-12 h-12 bg-neutral-100 flex items-center justify-center flex-shrink-0"><Camera className="w-5 h-5" /></div>
                <div>
                  <span className="text-sm font-medium block">Scan a Tag</span>
                  <span className="text-xs text-muted-foreground">Use your camera to photograph a price tag or label</span>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
              </button>

              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-4 p-5 bg-white border border-neutral-200 hover:border-neutral-400 transition-colors text-left" data-testid="button-upload-photo">
                <div className="w-12 h-12 bg-neutral-100 flex items-center justify-center flex-shrink-0"><Upload className="w-5 h-5" /></div>
                <div>
                  <span className="text-sm font-medium block">Upload Photo</span>
                  <span className="text-xs text-muted-foreground">Upload a photo of a tag, label, or product</span>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} data-testid="input-file-upload" />

              <div className="bg-white border border-neutral-200 p-5">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-neutral-100 flex items-center justify-center flex-shrink-0"><Link className="w-5 h-5" /></div>
                  <div>
                    <span className="text-sm font-medium block">Paste a Product URL</span>
                    <span className="text-xs text-muted-foreground">From Nordstrom, SSENSE, Net-a-Porter, or any retailer</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.nordstrom.com/s/..."
                    className="flex-1 px-3 py-2.5 text-sm border border-neutral-200 bg-[#FAFAF8] focus:outline-none focus:border-neutral-400"
                    onKeyDown={(e) => e.key === "Enter" && scanUrl()}
                    data-testid="input-product-url"
                  />
                  <button onClick={scanUrl} disabled={!url.trim()} className="px-5 py-2.5 bg-[#111] text-white text-sm uppercase tracking-wider disabled:opacity-40 hover:bg-neutral-800 transition-colors" data-testid="button-scan-url">
                    Scan
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm" data-testid="text-scan-error">{error}</div>
            )}
          </>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
            <p className="text-sm text-muted-foreground">Analyzing product...</p>
            <p className="text-xs text-muted-foreground/60">Searching 17,000+ verified products</p>
          </div>
        )}

        {result && (
          <div className="space-y-8">
            <button onClick={reset} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4" data-testid="button-scan-again">
              <ChevronLeft className="w-4 h-4" /> Scan another product
            </button>

            <div className="bg-white border border-neutral-200 p-6">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Identified</p>
              <h2 className="text-xl md:text-2xl font-serif mb-1" data-testid="text-result-brand">{result.tagInfo.brandName}</h2>
              {result.tagInfo.productName && <p className="text-sm text-muted-foreground mb-2" data-testid="text-result-product">{result.tagInfo.productName}</p>}
              {result.tagInfo.price && <p className="text-lg font-medium" data-testid="text-result-price">{result.tagInfo.price}</p>}
              <p className="text-[10px] text-muted-foreground/60 mt-2">{result.tagInfo.rawText}</p>
            </div>

            {result.designerInfo && (
              <div className="bg-white border border-neutral-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">In Our Directory</p>
                    <h3 className="text-lg font-serif mb-1">{result.designerInfo.name}</h3>
                    {result.designerInfo.description && <p className="text-sm text-muted-foreground line-clamp-3">{result.designerInfo.description}</p>}
                  </div>
                  {result.designerInfo.slug && (
                    <RouterLink href={`/designers/${result.designerInfo.slug}`} className="text-xs uppercase tracking-wider border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50 transition-colors whitespace-nowrap flex-shrink-0" data-testid="link-brand-page">
                      View Brand
                    </RouterLink>
                  )}
                </div>
              </div>
            )}

            {result.brandStats && (
              <div className="bg-white border border-neutral-200 p-6">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Brand Rating</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-medium ${ratingColor(result.brandStats.rating)}`} data-testid="text-brand-rating">
                        {result.brandStats.rating}
                      </span>
                      <span className="text-sm text-muted-foreground">{result.brandStats.productCount} verified products</span>
                    </div>
                    <div className="w-full bg-neutral-100 h-2">
                      <div className="h-full bg-emerald-700 transition-all duration-700" style={{ width: `${result.brandStats.avgFiber}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{result.brandStats.avgFiber}% average natural fiber content</p>
                  </div>
                </div>
              </div>
            )}

            {result.webIntel && (
              <div className="bg-white border border-neutral-200 p-6 space-y-5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Internet Intelligence</p>

                {result.webIntel.composition && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider mb-1.5">Likely Composition</p>
                    <p className="text-sm">{result.webIntel.composition}</p>
                    {result.webIntel.naturalFiberPercent !== null && (
                      <div className="mt-2">
                        <div className="w-full bg-neutral-100 h-2">
                          <div className="h-full bg-emerald-700 transition-all duration-700" style={{ width: `${result.webIntel.naturalFiberPercent}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{result.webIntel.naturalFiberPercent}% natural fiber</p>
                      </div>
                    )}
                  </div>
                )}

                {result.webIntel.qualityNotes && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider mb-1.5">Quality Assessment</p>
                    <p className="text-sm text-muted-foreground">{result.webIntel.qualityNotes}</p>
                  </div>
                )}

                {result.webIntel.verdict && (
                  <div className="p-4 bg-[#FAFAF8] border border-neutral-100">
                    <p className="text-xs font-medium uppercase tracking-wider mb-1.5">Verdict</p>
                    <p className="text-sm">{result.webIntel.verdict}</p>
                  </div>
                )}

                {result.webIntel.priceRange && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider mb-1.5">Price Range</p>
                    <p className="text-sm text-muted-foreground">{result.webIntel.priceRange}</p>
                  </div>
                )}

                {result.webIntel.otherRetailers && result.webIntel.otherRetailers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider mb-1.5">Also Available At</p>
                    <div className="flex flex-wrap gap-2">
                      {result.webIntel.otherRetailers.map((r, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 bg-neutral-100">{r}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.webIntel.sustainabilityNotes && (
                  <div className="flex items-start gap-2">
                    <Leaf className="w-3.5 h-3.5 text-emerald-700 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider mb-1">Sustainability</p>
                      <p className="text-sm text-muted-foreground">{result.webIntel.sustainabilityNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {result.products.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-4">Verified Products from {result.tagInfo.brandName}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {result.products.slice(0, 6).map((p: any) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}

            {result.betterAlternatives.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Higher Quality Alternatives</p>
                <p className="text-xs text-muted-foreground mb-4">Similar items with better natural fiber content</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {result.betterAlternatives.map((p: any) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
