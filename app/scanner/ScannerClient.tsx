'use client';

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, Loader2, ArrowRight, Leaf, ShoppingBag, ChevronLeft, X, Scan, Sparkles, MessageCircle, Heart, CheckCircle2, AlertTriangle, ShieldCheck, ExternalLink, Link2, ScanBarcode, ImageIcon, Globe, Zap } from "lucide-react";
import Link from "next/link";
import { useProductFavorites } from "../hooks/use-product-favorites";
import { trackScanStart, trackScanComplete, trackScanError } from "../../lib/analytics";
import { detectDevice } from "../../lib/device-detection";
import { getOrCreateSessionId } from "../../lib/session";
import { scoreColor, getVerdictMessage, getVerdictLabel, FIRST_SCAN_FOOTNOTE, parsePriceNumber } from "../../lib/scanner-copy";
import { QRCodeSVG } from "qrcode.react";

type FiberEntry = { fiber: string; percent: number; isNatural: boolean; classification?: string };

type ScanResult = {
  tagInfo: {
    brandName: string; productName: string; price: string; composition: string;
    garmentType?: string; size?: string; madeIn?: string; careInstructions?: string;
    confidence: string; rawText: string; inputType?: string;
    color?: string; silhouette?: string; barcode?: string;
  };
  imageUrl?: string;
  fiberBreakdown: FiberEntry[];
  naturalPercent: number;
  qualityScore?: number;
  isNatural: boolean;
  verdict: string;
  category: string;
  products: any[];
  matched: boolean;
  brandStats: { avgFiber: number; rating: string; productCount: number } | null;
  designerInfo: { name: string; slug: string; logo_url: string; website: string; description: string; rating: string; hasProducts: boolean } | null;
  betterAlternatives: any[];
  confirmationPrompt?: string | null;
  verdictMessage?: string;
  needsCompositionLabel?: boolean;
  needsCompositionMessage?: string | null;
  isNewToDatabase?: boolean;
  alternativesLabel?: string;
  success?: boolean;
};

type ScanMode = "idle" | "camera-photo" | "camera-barcode";

function ratingColor(rating: string) {
  switch (rating) {
    case "Exceptional": return "bg-emerald-900 text-emerald-100";
    case "Excellent": return "bg-emerald-800 text-emerald-100";
    case "Good": return "bg-amber-800 text-amber-100";
    case "Caution": return "bg-red-900 text-red-100";
    default: return "bg-neutral-800 text-neutral-200";
  }
}

function classificationColor(cls?: string) {
  if (cls === "natural") return "bg-emerald-600";
  if (cls === "semi-synthetic") return "bg-amber-500";
  return "bg-red-400";
}

function classificationLabel(cls?: string) {
  if (cls === "natural") return "Natural";
  if (cls === "semi-synthetic") return "Semi-Synthetic";
  return "Synthetic";
}

function NaturalScoreRing({ percent, size = 80 }: { percent: number; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 95 ? "#15803d" : percent >= 70 ? "#b45309" : "#dc2626";

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

function QualityScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? "bg-emerald-600" : score >= 70 ? "bg-amber-500" : "bg-red-400";
  const label = score >= 90 ? "Excellent" : score >= 70 ? "Good" : score >= 40 ? "Fair" : "Low";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-neutral-100 overflow-hidden">
        <div className={`h-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground w-14 text-right">{label} ({score})</span>
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
          <div className="w-24 text-[11px] capitalize text-right font-medium">{f.fiber}</div>
          <div className="flex-1 h-2 bg-neutral-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${classificationColor(f.classification)}`}
              style={{ width: `${f.percent}%` }}
            />
          </div>
          <div className="w-10 text-[11px] text-muted-foreground">{f.percent}%</div>
          <span className={`text-[8px] px-1 py-0.5 uppercase tracking-wide font-medium ${
            f.classification === "natural" ? "text-emerald-700 bg-emerald-50" :
            f.classification === "semi-synthetic" ? "text-amber-700 bg-amber-50" :
            "text-red-700 bg-red-50"
          }`}>
            {classificationLabel(f.classification)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScannerProductCard({
  product,
  index,
  currentScanPrice,
  scannedUPC,
  onShopClick,
}: {
  product: any;
  index: number;
  currentScanPrice: number | null;
  scannedUPC: string;
  onShopClick: (product: any, position: number) => void;
}) {
  const { toggle, isFavorited } = useProductFavorites();
  const productId = String(product.id);
  const saved = isFavorited(productId);
  const name = product.name || product.productName || "";
  const brandName = product.brand_name || product.brandName || "";
  const imageUrl = product.image_url || product.imageUrl;
  const price = product.price;
  const naturalFiber = product.natural_fiber_percent ?? product.naturalFiberPercent ?? 0;
  const altPrice = parsePriceNumber(price);

  return (
    <div className="flex flex-col" data-testid={`product-scan-${product.id}`}>
      <Link href={`/product/${product.id}`} className="group flex flex-col">
        <div className="relative">
          <div className="aspect-[3/4] bg-[#f0f0ee] relative overflow-hidden">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading="lazy" style={{ borderRadius: 0 }} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-neutral-300" /></div>
            )}
          </div>
          <div className="absolute top-2 right-2 bg-white px-2 py-1 z-10" style={{ border: "1px solid #F2F2F2", borderRadius: 0 }}>
            <span className="text-xs font-medium" style={{ color: scoreColor(naturalFiber) }}>{naturalFiber}%</span>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId, brandName, price); }}
            className="absolute top-2 left-2 z-10 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
            style={{ borderRadius: 0 }}
            data-testid={`btn-favorite-scan-${product.id}`}
            aria-label={saved ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart className={`w-4 h-4 transition-colors ${saved ? "fill-red-500 text-red-500" : "text-foreground/60 hover:text-foreground"}`} />
          </button>
        </div>
      </Link>
      <div className="pt-3 pb-4">
        <p className="text-xs tracking-widest uppercase text-gray-900 mb-1" style={{ letterSpacing: "0.12em" }}>{brandName}</p>
        <p className="text-xs text-gray-500 mb-2 leading-relaxed line-clamp-2">{name}</p>
        <div className="flex items-center gap-2 mb-3">
          {price && (
            <span className="text-sm" style={{ color: altPrice != null && currentScanPrice != null && altPrice < currentScanPrice ? "#0D9488" : "#1C2B2A" }}>
              {price}
            </span>
          )}
          {altPrice != null && currentScanPrice != null && altPrice < currentScanPrice && (
            <span className="text-xs text-gray-400">↓</span>
          )}
        </div>
        {product.url && (
          <button
            type="button"
            onClick={() => onShopClick(product, index)}
            className="w-full text-white text-xs tracking-widest uppercase py-2.5"
            style={{ background: "#1C2B2A", letterSpacing: "0.15em", borderRadius: 0 }}
          >
            Shop Now
          </button>
        )}
      </div>
    </div>
  );
}

function ConfirmationOverlay({
  prompt,
  category,
  color,
  garmentType,
  onConfirm,
  onCorrect,
}: {
  prompt: string;
  category: string;
  color: string;
  garmentType: string;
  onConfirm: () => void;
  onCorrect: (corrections: { category?: string; color?: string; garmentType?: string }) => void;
}) {
  const [correcting, setCorrecting] = useState(false);
  const [editCat, setEditCat] = useState(category);
  const [editColor, setEditColor] = useState(color);
  const [editType, setEditType] = useState(garmentType);

  const categories = ["tops", "bottoms", "dresses", "outerwear", "knitwear", "skirts", "shorts", "swimwear", "loungewear"];

  return (
    <div className="p-4 md:p-5 mb-6 bg-amber-50 border border-amber-200" data-testid="confirmation-overlay">
      <div className="flex items-start gap-3">
        <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900 mb-1">Quick Confirmation</p>
          <p className="text-[12px] text-amber-700 mb-3">{prompt}</p>
          {!correcting ? (
            <div className="flex gap-2">
              <button onClick={onConfirm}
                className="px-4 py-2 bg-[#111] text-white text-[10px] uppercase tracking-[0.12em] font-medium hover:bg-neutral-800 transition-colors"
                data-testid="button-confirm-yes"
              >
                Yes, that's right
              </button>
              <button onClick={() => setCorrecting(true)}
                className="px-4 py-2 bg-white border border-neutral-300 text-[10px] uppercase tracking-[0.12em] font-medium hover:border-neutral-500 transition-colors"
                data-testid="button-confirm-no"
              >
                Not quite
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground block mb-1">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setEditCat(cat)}
                      className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] border transition-colors ${editCat === cat ? "bg-[#111] text-white border-[#111]" : "bg-white border-neutral-200 hover:border-neutral-400"}`}
                      data-testid={`button-cat-${cat}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground block mb-1">Color</label>
                <input value={editColor} onChange={e => setEditColor(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-neutral-200 bg-white focus:outline-none focus:border-neutral-400"
                  placeholder="e.g. black, navy blue"
                  data-testid="input-correct-color"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground block mb-1">Garment Type</label>
                <input value={editType} onChange={e => setEditType(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-neutral-200 bg-white focus:outline-none focus:border-neutral-400"
                  placeholder="e.g. midi dress, slim jeans"
                  data-testid="input-correct-type"
                />
              </div>
              <button
                onClick={() => onCorrect({ category: editCat, color: editColor, garmentType: editType })}
                className="px-4 py-2 bg-[#111] text-white text-[10px] uppercase tracking-[0.12em] font-medium hover:bg-neutral-800 transition-colors"
                data-testid="button-submit-corrections"
              >
                Update & Find Alternatives
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ScannerClient() {
  const [device, setDevice] = useState<string>("desktop");
  const [showInterstitial, setShowInterstitial] = useState(true);
  const [mode, setMode] = useState<ScanMode>("idle");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scannedUrl, setScannedUrl] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [barcodeDetected, setBarcodeDetected] = useState("");
  const [activeTab, setActiveTab] = useState<"photo" | "barcode" | "url">("photo");
  const [scannedUPC, setScannedUPC] = useState("");
  const [currentScanPrice, setCurrentScanPrice] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDevice(detectDevice());
    const token = localStorage.getItem("intertexe_auth_token");
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => setIsLoggedIn(!!user))
      .catch(() => setIsLoggedIn(false));
  }, []);

  const handleAffiliateClick = useCallback(async (product: any, position: number) => {
    const affiliateUrl = product.url;
    if (!affiliateUrl) return;
    try {
      const res = await fetch("/api/scanner/track-clickout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          brandSlug: product.brand_slug,
          sessionId: getOrCreateSessionId(),
          scannedUPC: scannedUPC || result?.tagInfo?.barcode || null,
          scannedPrice: currentScanPrice,
          alternativePrice: parsePriceNumber(product.price),
          position: position + 1,
          affiliateUrl,
        }),
      });
      const data = await res.json();
      window.open(data.redirect_url || affiliateUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.open(affiliateUrl, "_blank", "noopener,noreferrer");
    }
  }, [scannedUPC, result, currentScanPrice]);

  const stopCamera = useCallback(() => {
    if (barcodeIntervalRef.current) {
      clearInterval(barcodeIntervalRef.current);
      barcodeIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (forBarcode = false) => {
    setMode(forBarcode ? "camera-barcode" : "camera-photo");
    setError("");
    setBarcodeDetected("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      if (forBarcode && typeof (window as any).BarcodeDetector !== "undefined") {
        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
        barcodeIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              setBarcodeDetected(code);
              stopCamera();
              setMode("idle");
              await scanBarcode(code);
            }
          } catch {}
        }, 500);
      }
    } catch {
      setError("Camera access denied. Try uploading a photo instead.");
      setMode("idle");
    }
  }, [stopCamera]);

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

  const callScanApi = async (body: any): Promise<ScanResult> => {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        session_id: getOrCreateSessionId(),
        device_type: device,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Scan failed");
    return data;
  };

  const loadFallbackProducts = async (): Promise<any[]> => {
    try {
      const shopRes = await fetch("/api/shop?limit=12&sort=recommended", { cache: "no-store" });
      if (shopRes.ok) {
        const data = await shopRes.json();
        if (Array.isArray(data?.products) && data.products.length > 0) return data.products.slice(0, 12);
      }
    } catch {}
    try {
      const productRes = await fetch("/api/products?limit=12", { cache: "no-store" });
      if (productRes.ok) {
        const data = await productRes.json();
        if (Array.isArray(data) && data.length > 0) return data.slice(0, 12);
      }
    } catch {}
    return [];
  };

  const buildFallbackResult = async (source: "url" | "photo" | "barcode", sourceValue = ""): Promise<ScanResult> => {
    const alternatives = await loadFallbackProducts();
    let host = "";
    if (source === "url" && sourceValue) {
      try { host = new URL(sourceValue).hostname.replace(/^www\./, ""); } catch {}
    }
    return {
      tagInfo: {
        brandName: host ? host.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Unknown",
        productName: "",
        price: "",
        composition: "",
        garmentType: "",
        size: "",
        madeIn: "",
        careInstructions: "",
        confidence: "low",
        rawText: source === "url" && host ? `From ${host}` : "Fallback scan",
        inputType: source,
        color: "",
        silhouette: "",
        barcode: source === "barcode" ? sourceValue : "",
      },
      imageUrl: "",
      fiberBreakdown: [],
      naturalPercent: 0,
      qualityScore: 0,
      isNatural: false,
      verdict: "For the full fiber breakdown scan the care label inside the garment.",
      verdictMessage: "For the full fiber breakdown scan the care label inside the garment.",
      category: "",
      products: [],
      matched: alternatives.length > 0,
      brandStats: null,
      designerInfo: null,
      betterAlternatives: alternatives,
      confirmationPrompt: null,
    };
  };

  const scanImage = async (base64: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    setShowConfirmation(false);
    trackScanStart("upload");
    try {
      const data = await callScanApi({ image: base64 });
      setCurrentScanPrice(parsePriceNumber(data.tagInfo?.price));
      setResult(data);
      if (data.confirmationPrompt && data.tagInfo?.confidence !== "high") {
        setShowConfirmation(true);
      }
      trackScanComplete(data.tagInfo?.brandName || "unknown", "upload", data.matched);
    } catch (err: any) {
      setResult(await buildFallbackResult("photo"));
      setError("");
      trackScanError("upload", err.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const scanBarcode = async (code: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    setShowConfirmation(false);
    trackScanStart("barcode");
    try {
      const data = await callScanApi({ barcode: code });
      setScannedUPC(code);
      setCurrentScanPrice(parsePriceNumber(data.tagInfo?.price));
      setResult(data);
      if (data.confirmationPrompt) setShowConfirmation(true);
      trackScanComplete(data.tagInfo?.brandName || "unknown", "barcode", data.matched);
    } catch (err: any) {
      setResult(await buildFallbackResult("barcode", code));
      setError("");
      trackScanError("barcode", err.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const normalizeUrl = (raw: string): string => {
    let u = raw
      .trim()
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, "");
    if (u && !u.match(/^https?:\/\//i)) {
      u = "https://" + u;
    }
    return u;
  };

  const scanUrl = async () => {
    if (!url.trim()) return;
    const cleanUrl = normalizeUrl(url);
    try {
      new URL(cleanUrl);
    } catch {
      setError("Paste a full product link, for example https://www.example.com/product-name");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setScannedUrl(cleanUrl);
    setShowConfirmation(false);
    trackScanStart("url");
    try {
      const data = await callScanApi({ url: cleanUrl });
      setCurrentScanPrice(parsePriceNumber(data.tagInfo?.price));
      setResult(data);
      if (data.confirmationPrompt && data.tagInfo?.confidence !== "high") {
        setShowConfirmation(true);
      }
      trackScanComplete(data.tagInfo?.brandName || "unknown", "url", data.matched);
    } catch (err: any) {
      setResult(await buildFallbackResult("url", cleanUrl));
      setError("");
      trackScanError("url", err.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    setShowConfirmation(false);
  };

  const handleCorrections = async (corrections: { category?: string; color?: string; garmentType?: string }) => {
    setShowConfirmation(false);
    setLoading(true);
    try {
      const body: any = { confirmation: corrections };
      if (scannedUrl) body.url = scannedUrl;
      else if (result?.tagInfo?.barcode) body.barcode = result.tagInfo.barcode;
      const data = await callScanApi(body);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Update failed.");
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

  const reset = () => {
    stopCamera();
    setResult(null);
    setError("");
    setUrl("");
    setScannedUrl("");
    setMode("idle");
    setLoading(false);
    setShowConfirmation(false);
    setBarcodeDetected("");
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL || "#";

  if (device === "iphone" && showInterstitial) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-8 text-center">
        <p className="text-xs tracking-widest text-gray-400 mb-12" style={{ letterSpacing: "0.25em" }}>
          INTERTEXE · THE MATERIAL STANDARD
        </p>
        <h1 className="text-4xl font-extralight text-gray-900 mb-6" style={{ lineHeight: 1.15 }}>
          The scanner<br />lives in the app.
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-12 max-w-xs">
          Point your camera at any price tag or fabric label. Get the fiber composition instantly. Find better natural fiber alternatives at a similar price.
        </p>
        <a
          href={appStoreUrl}
          className="w-full max-w-xs bg-black text-white text-xs tracking-widest uppercase py-4 text-center mb-4"
          style={{ letterSpacing: "0.2em", borderRadius: 0 }}
        >
          Download on the App Store
        </a>
        <button type="button" onClick={() => setShowInterstitial(false)} className="text-xs text-gray-400">
          Continue browsing instead
        </button>
      </div>
    );
  }

  if ((device === "desktop" || device === "ipad") && !result && !loading) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <p className="text-xs tracking-widest text-gray-400 mb-8" style={{ letterSpacing: "0.25em" }}>SCANNER</p>
        <h1 className="text-4xl font-extralight text-gray-900 mb-4" style={{ lineHeight: 1.2 }}>
          Know what you are wearing.
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-16 max-w-sm mx-auto">
          Point your camera at any care label or price tag. Intertexe reads the fiber composition instantly and shows you better natural alternatives at a similar price if needed.
        </p>
        <div className="flex flex-col items-center gap-6">
          <div className="border border-gray-100 p-4 inline-block" style={{ borderRadius: 0 }}>
            <QRCodeSVG
              value="https://www.intertexe.com/scanner?utm_source=desktop_qr&utm_medium=qr&utm_campaign=desktop_scanner"
              size={180}
              fgColor="#1C2B2A"
              bgColor="#FFFFFF"
            />
          </div>
          <p className="text-xs text-gray-400" style={{ letterSpacing: "0.05em" }}>
            Scan with your phone to open the scanner.
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-16">Already have the app? Open it and tap Scanner.</p>
      </div>
    );
  }

  if (mode === "camera-photo" || mode === "camera-barcode") {
    const isBarcode = mode === "camera-barcode";
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <button onClick={() => { stopCamera(); setMode("idle"); }} className="text-white/80 p-1" data-testid="button-close-camera">
            <X className="w-6 h-6" />
          </button>
          <span className="text-white/60 text-xs uppercase tracking-widest">
            {isBarcode ? "Scan Barcode" : "Scan Tag / Garment"}
          </span>
          <div className="w-6" />
        </div>
        <video ref={videoRef} className="flex-1 object-cover" playsInline autoPlay muted />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`border-2 border-white/30 relative ${isBarcode ? "w-72 h-28 md:w-96 md:h-36" : "w-64 h-40 md:w-80 md:h-52"}`}>
            <div className="absolute -top-px -left-px w-6 h-6 border-t-2 border-l-2 border-white" />
            <div className="absolute -top-px -right-px w-6 h-6 border-t-2 border-r-2 border-white" />
            <div className="absolute -bottom-px -left-px w-6 h-6 border-b-2 border-l-2 border-white" />
            <div className="absolute -bottom-px -right-px w-6 h-6 border-b-2 border-r-2 border-white" />
            {isBarcode && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[90%] h-[1px] bg-red-500/60 animate-pulse" />
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">
          <p className="text-white/50 text-[11px] tracking-wide">
            {isBarcode ? "Point at the barcode — it will scan automatically" : "Point at the clothing tag or garment"}
          </p>
          {!isBarcode && (
            <button onClick={capturePhoto} className="w-[68px] h-[68px] rounded-full border-[3px] border-white/80 flex items-center justify-center active:scale-95 transition-transform" data-testid="button-capture">
              <div className="w-[56px] h-[56px] rounded-full bg-white" />
            </button>
          )}
          {isBarcode && (
            <button onClick={capturePhoto}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white text-[10px] uppercase tracking-[0.15em] active:scale-95 transition-transform"
              data-testid="button-capture-barcode-manual"
            >
              Take photo instead
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {!result && !loading && (
        <>
          <div className="pt-8 md:pt-14 pb-6 md:pb-8">
            <h1 className="text-2xl md:text-[40px] font-serif leading-tight mb-2" data-testid="text-scanner-title">Shopping Intelligence</h1>
            <p className="text-[12px] md:text-sm text-muted-foreground leading-relaxed">
              Scan a barcode, photograph a tag or garment, or paste a product link — we'll analyze the fiber composition and find natural-fiber alternatives.
            </p>
          </div>

          <div className="flex border-b border-neutral-200 mb-5">
            {([
              { key: "photo" as const, icon: ImageIcon, label: "Photo" },
              { key: "barcode" as const, icon: ScanBarcode, label: "Barcode" },
              { key: "url" as const, icon: Globe, label: "URL" },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] uppercase tracking-[0.12em] font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? "border-[#111] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "photo" && (
            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => startCamera(false)}
                  className="group flex flex-col items-center gap-3 p-6 md:p-8 bg-[#111] text-white hover:bg-neutral-900 transition-all active:scale-[0.98]"
                  data-testid="button-camera-scan"
                >
                  <Camera className="w-6 h-6" />
                  <div className="text-center">
                    <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.12em] block">Open Camera</span>
                    <span className="text-[9px] text-white/40 mt-1 block">Tag or garment</span>
                  </div>
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center gap-3 p-6 md:p-8 bg-white border border-neutral-200 hover:border-neutral-400 transition-all active:scale-[0.98]"
                  data-testid="button-upload-photo"
                >
                  <Upload className="w-6 h-6 text-neutral-600" />
                  <div className="text-center">
                    <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.12em] block">Upload Photo</span>
                    <span className="text-[9px] text-muted-foreground/50 mt-1 block">From gallery</span>
                  </div>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} data-testid="input-file-upload" />
              <p className="text-[11px] text-muted-foreground/50 text-center">
                Works with composition labels, price tags, or photos of the garment itself
              </p>
            </div>
          )}

          {activeTab === "barcode" && (
            <div className="space-y-3 mb-6">
              <button onClick={() => startCamera(true)}
                className="w-full group flex flex-col items-center gap-3 p-8 md:p-10 bg-[#111] text-white hover:bg-neutral-900 transition-all active:scale-[0.98]"
                data-testid="button-barcode-scan"
              >
                <ScanBarcode className="w-8 h-8" />
                <div className="text-center">
                  <span className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.12em] block">Scan Barcode</span>
                  <span className="text-[9px] text-white/40 mt-1 block">Auto-detects EAN, UPC, QR codes</span>
                </div>
              </button>
              <p className="text-[11px] text-muted-foreground/50 text-center">
                Point your camera at the barcode on the price tag. If barcode data is limited, we'll ask you to confirm the item details.
              </p>
            </div>
          )}

          {activeTab === "url" && (
            <div className="space-y-3 mb-6">
              <div className="bg-white border border-neutral-200 p-4 md:p-5">
                <div className="flex gap-2">
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste product URL..."
                    className="flex-1 min-w-0 px-3 py-2.5 text-[13px] border border-neutral-200 bg-[#FAFAF8] focus:outline-none focus:border-neutral-400 placeholder:text-neutral-300"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); scanUrl(); } }}
                    autoComplete="off"
                    data-testid="input-product-url"
                  />
                  <button type="button" onClick={scanUrl} disabled={!url.trim()}
                    className="px-4 py-2.5 bg-[#111] text-white text-[10px] uppercase tracking-[0.15em] font-medium disabled:opacity-30 hover:bg-neutral-800 transition-colors flex-shrink-0"
                    data-testid="button-scan-url"
                  >
                    Scan
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/50 text-center">
                Works with most fashion retailer websites — Zara, Mango, Net-a-Porter, SSENSE, and more
              </p>
            </div>
          )}

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
            <p className="text-sm font-medium mb-1">Analyzing product</p>
            <p className="text-[11px] text-muted-foreground">Extracting composition, classifying fibers & finding alternatives</p>
          </div>
        </div>
      )}

      {result && (() => {
        const pct = result.naturalPercent;
        const isGreat = pct >= 70;
        const hasImage = !!result.imageUrl;
        const hasQualityScore = typeof result.qualityScore === "number" && result.qualityScore > 0;

        return (
          <div className="pt-6 md:pt-10 pb-8">
            <button onClick={reset} className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors mb-6" data-testid="button-scan-again" style={{ borderRadius: 0 }}>
              <ChevronLeft className="w-3.5 h-3.5" /> SCAN ANOTHER ITEM
            </button>

            {(pct > 0 || result.tagInfo.composition) && (
              <div className="mb-8">
                <div className="flex items-end gap-1 mb-2">
                  <span className="font-extralight" style={{ fontSize: "88px", lineHeight: 1, color: scoreColor(pct) }}>{pct}</span>
                  <span className="font-extralight mb-4" style={{ fontSize: "32px", color: scoreColor(pct) }}>%</span>
                  <span className="text-xs tracking-widest text-gray-400 mb-6 ml-2" style={{ letterSpacing: "0.2em" }}>{getVerdictLabel(pct)}</span>
                </div>
                <p className="text-sm font-light text-gray-700 mb-6 leading-relaxed">
                  {result.verdictMessage || getVerdictMessage(pct)}
                </p>
              </div>
            )}

            {result.needsCompositionMessage && (
              <p className="text-sm font-light text-gray-600 mb-6 leading-relaxed border-l-2 border-gray-200 pl-4">
                {result.needsCompositionMessage}
              </p>
            )}

            <div className={`mb-6 ${hasImage ? "flex gap-5" : ""}`}>
              {hasImage && (
                <div className="w-28 md:w-40 flex-shrink-0">
                  <div className="aspect-[3/4] bg-[#f0f0ee] relative overflow-hidden">
                    <img
                      src={result.imageUrl}
                      alt={result.tagInfo.productName || result.tagInfo.brandName}
                      className="absolute inset-0 w-full h-full object-cover"
                      data-testid="img-scanned-product"
                    />
                    <div className="absolute top-2 left-2">
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-bold backdrop-blur-sm text-white ${pct >= 95 ? "bg-emerald-900/90" : pct >= 70 ? "bg-amber-700/90" : "bg-red-700/90"}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  {scannedUrl && (
                    <a href={scannedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors" data-testid="link-original-product">
                      <ExternalLink className="w-3 h-3" />
                      <span>View original</span>
                    </a>
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl md:text-3xl font-serif mb-0.5" data-testid="text-result-brand">{result.tagInfo.brandName}</h2>
                    {result.tagInfo.productName && <p className="text-[13px] text-muted-foreground" data-testid="text-result-product">{result.tagInfo.productName}</p>}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {result.tagInfo.price && <span className="text-sm font-medium" data-testid="text-result-price">{result.tagInfo.price}</span>}
                      {result.tagInfo.garmentType && (
                        <span className="text-[10px] px-2 py-0.5 bg-neutral-100 border border-neutral-200 uppercase tracking-[0.08em]">{result.tagInfo.garmentType}</span>
                      )}
                      {result.tagInfo.color && (
                        <span className="text-[10px] px-2 py-0.5 bg-neutral-100 border border-neutral-200 capitalize">{result.tagInfo.color}</span>
                      )}
                      {result.tagInfo.confidence && (
                        <span className={`text-[8px] px-1.5 py-0.5 uppercase tracking-[0.1em] font-medium ${
                          result.tagInfo.confidence === "high" || result.tagInfo.confidence === "confirmed" ? "bg-emerald-50 text-emerald-700" :
                          result.tagInfo.confidence === "medium" ? "bg-amber-50 text-amber-700" :
                          "bg-neutral-100 text-muted-foreground"
                        }`} data-testid="text-confidence">
                          {result.tagInfo.confidence === "brand-average" ? "estimated" : result.tagInfo.confidence}
                        </span>
                      )}
                    </div>
                  </div>
                  {!hasImage && <NaturalScoreRing percent={pct} />}
                </div>
              </div>
            </div>

            {showConfirmation && result.confirmationPrompt && (
              <ConfirmationOverlay
                prompt={result.confirmationPrompt}
                category={result.category}
                color={result.tagInfo.color || ""}
                garmentType={result.tagInfo.garmentType || ""}
                onConfirm={handleConfirm}
                onCorrect={handleCorrections}
              />
            )}

            <div className={`p-4 md:p-5 mb-6 ${isGreat ? "bg-emerald-50 border border-emerald-200" : pct > 0 ? "bg-red-50 border border-red-200" : "bg-neutral-50 border border-neutral-200"}`}>
              <div className="flex items-start gap-3">
                {isGreat ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                ) : pct > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Sparkles className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium mb-1 ${isGreat ? "text-emerald-900" : pct > 0 ? "text-red-900" : "text-neutral-800"}`}>
                    {isGreat
                      ? (result.tagInfo.confidence === "brand-average" ? "Brand Catalog Estimate"
                        : result.tagInfo.confidence === "inferred" ? "Natural Material Detected"
                        : "Natural Fiber Verified")
                      : pct > 0 ? "Synthetic Material Detected" : "Explore Natural Alternatives"}
                  </p>
                  <p className={`text-[12px] leading-relaxed ${isGreat ? "text-emerald-700" : pct > 0 ? "text-red-700" : "text-muted-foreground"}`} data-testid="text-verdict">
                    {result.verdict}
                  </p>
                </div>
                {hasImage && <NaturalScoreRing percent={pct} size={64} />}
              </div>
            </div>

            {result.tagInfo.composition && (
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">Fiber Analysis</p>
                <p className="text-[13px] mb-4 font-medium" data-testid="text-result-composition">{result.tagInfo.composition}</p>
                {result.fiberBreakdown.length > 0 && (
                  <FiberBreakdownBar fibers={result.fiberBreakdown} />
                )}
                {hasQualityScore && (
                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 mb-1.5">Quality Score</p>
                    <QualityScoreBar score={result.qualityScore!} />
                  </div>
                )}
              </div>
            )}

            {(result.tagInfo.madeIn || result.tagInfo.careInstructions || result.tagInfo.silhouette) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {result.tagInfo.madeIn && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Made In</p>
                    <p className="text-[13px]">{result.tagInfo.madeIn}</p>
                  </div>
                )}
                {result.tagInfo.silhouette && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Silhouette</p>
                    <p className="text-[13px] capitalize">{result.tagInfo.silhouette}</p>
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
                      ? "Similar pieces from verified brands — all 80%+ natural fiber"
                      : `${result.betterAlternatives.length} alternatives from ${new Set(result.betterAlternatives.map((p: any) => p.brand_name || p.brandName)).size} different brands — all verified natural fiber`}
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {result.betterAlternatives.map((p: any, idx: number) => (
                    <ScannerProductCard
                      key={p.id}
                      product={p}
                      index={idx}
                      currentScanPrice={currentScanPrice}
                      scannedUPC={scannedUPC}
                      onShopClick={handleAffiliateClick}
                    />
                  ))}
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
                  {result.products.slice(0, 8).map((p: any, idx: number) => (
                    <ScannerProductCard
                      key={p.id}
                      product={p}
                      index={idx}
                      currentScanPrice={currentScanPrice}
                      scannedUPC={scannedUPC}
                      onShopClick={handleAffiliateClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {result.isNewToDatabase && (
              <p className="text-xs text-gray-300 text-center pb-4" style={{ letterSpacing: "0.05em" }}>
                {FIRST_SCAN_FOOTNOTE}
              </p>
            )}

            {!isLoggedIn && (
              <div className="border-t border-gray-100 px-0 py-8">
                <p className="text-xs tracking-widest text-gray-400 mb-3" style={{ letterSpacing: "0.2em" }}>SAVE THIS SCAN</p>
                <p className="text-sm font-light text-gray-700 leading-relaxed mb-5">
                  Create an account to save your scan history and receive personalised natural fiber recommendations.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/account"
                    className="flex-1 text-white text-xs tracking-widest uppercase py-3.5 text-center"
                    style={{ background: "#1C2B2A", letterSpacing: "0.15em", borderRadius: 0 }}
                  >
                    Create account
                  </Link>
                  <Link
                    href="/account"
                    className="flex-1 text-xs tracking-widest uppercase py-3.5 text-center"
                    style={{ letterSpacing: "0.15em", border: "1px solid #1C2B2A", color: "#1C2B2A", borderRadius: 0 }}
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            )}

            <Link href="/chat" className="flex items-center gap-3 p-4 bg-[#111] text-white hover:bg-neutral-900 transition-colors active:scale-[0.98] mb-8" data-testid="link-chat-from-results" style={{ borderRadius: 0 }}>
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
