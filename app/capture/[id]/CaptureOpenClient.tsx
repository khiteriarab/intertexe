"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { affiliateUrlWithClientU1 } from "@/lib/affiliate-url";
import { getUniversalOpenUrl } from "@/lib/app-store";
import { shopAtLabel } from "@/lib/capture-page-signals";
import { buildCaptureResultView, type CaptureResultAltView } from "@/lib/capture-result";
import { savingsPercent } from "@/lib/material-insight";
import { AFFILIATE_DISCLOSURE, TX_MATCH_TAGLINE } from "@/lib/tx-match-copy";

const TOKEN_KEY = "intertexe_auth_token";

type Capture = Record<string, unknown> & {
  id: string;
  enrichment_status?: string | null;
  original_url?: string | null;
  image_url?: string | null;
  source_app?: string | null;
  price?: number | null;
  currency?: string | null;
  alternatives?: unknown[] | null;
};

/**
 * Saved piece + TX Matches on one page.
 * Desktop: source beside a 2–3 column grid. Mobile: single column.
 */
export default function CaptureOpenClient({ captureId }: { captureId: string }) {
  const [capture, setCapture] = useState<Capture | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const appHref = getUniversalOpenUrl(`/capture/${captureId}`, {
    cta: "chrome_extension_open",
  });

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setNeedsAuth(true);
        return;
      }
      try {
        const res = await fetch(`/api/capture/${encodeURIComponent(captureId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          setNeedsAuth(true);
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const next = (data.capture || data) as Capture;
        setCapture(next);
        const nextAlts = Array.isArray(next?.alternatives) ? next.alternatives : [];
        const stillProcessing = ["pending", "enriching", "running", "enrichment_retry"].includes(
          String(next?.enrichment_status || "")
        );
        if (!nextAlts.length && stillProcessing && attempts < 15) {
          attempts += 1;
          timer = window.setTimeout(() => {
            void load();
          }, 2000);
        }
      } catch {
        if (!cancelled) setCapture({ id: captureId });
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [captureId]);

  const view = useMemo(() => (capture ? buildCaptureResultView(capture) : null), [capture]);
  const processing =
    Boolean(capture) &&
    (view?.alternatives.length || 0) === 0 &&
    ["pending", "enriching", "running", "enrichment_retry"].includes(
      String(capture?.enrichment_status || "")
    );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <p className="font-serif italic text-2xl text-foreground">INTERTEXE</p>
      <p className="mt-1 text-sm text-muted-foreground">{view?.tagline || TX_MATCH_TAGLINE}</p>

      {needsAuth ? (
        <div className="mt-8 max-w-xl rounded-3xl bg-white p-6 shadow-[0_18px_40px_rgba(22,20,18,0.08)]">
          <h1 className="font-serif text-3xl">Sign in to keep this piece</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your Inspiration is waiting — the same list as iOS — then TX Matches appear on this page.
          </p>
          <Link
            href={`/account?mode=login&next=/capture/${captureId}`}
            className="mt-6 flex h-12 items-center justify-center rounded-full bg-[#1f3d2b] text-sm font-semibold text-white"
          >
            Sign in to INTERTEXE
          </Link>
        </div>
      ) : null}

      {capture && view ? (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(260px,340px)_1fr]">
          <article className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_40px_rgba(22,20,18,0.08)]">
            {capture.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={String(capture.image_url)}
                alt=""
                className="aspect-[3/4] w-full bg-[#eee8e0] object-cover object-top"
              />
            ) : (
              <div className="aspect-[3/4] w-full bg-[#eee8e0]" />
            )}
            <div className="p-5 md:p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Saved in INTERTEXE
              </p>
              <h1 className="font-serif mt-2 text-3xl leading-tight">{view.title}</h1>
              <p className="mt-2 text-sm text-[#3f3a36]">
                {[view.brandLine, view.priceLabel].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[#161412]">{view.materialLine}</p>
              {view.liningNote ? (
                <p className="mt-2 text-sm leading-relaxed text-[#9a5340]">{view.liningNote}</p>
              ) : null}
              <p className="mt-3 text-sm text-muted-foreground">{view.insight.label}</p>
              {capture.original_url ? (
                <p className="mt-5 text-sm">
                  <a
                    href={String(capture.original_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1f3d2b] underline-offset-4 hover:underline"
                  >
                    View original source
                  </a>
                </p>
              ) : null}
              <a
                href={appHref}
                className="mt-5 flex h-12 items-center justify-center rounded-full bg-[#1f3d2b] text-sm font-semibold text-white"
              >
                Continue in the INTERTEXE app
              </a>
            </div>
          </article>

          <section>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              TX Matches
            </p>
            <h2 className="font-serif mt-2 text-2xl md:text-3xl">
              {processing ? "Finding other options…" : view.alternativesTitle}
            </h2>
            {view.alternatives.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {view.alternatives.map((alt) => (
                  <MatchCard
                    key={alt.id}
                    alt={alt}
                    originalPrice={typeof capture.price === "number" ? capture.price : null}
                    originalCurrency={capture.currency ? String(capture.currency) : null}
                    sourceApp={capture.source_app ? String(capture.source_app) : null}
                    captureId={capture.id}
                  />
                ))}
              </div>
            ) : !processing ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Other options will appear here as soon as TX Match finishes reading this piece.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-64 animate-pulse rounded-2xl bg-[#eee8e0]" />
                ))}
              </div>
            )}
            <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
              {view.affiliateDisclosure || AFFILIATE_DISCLOSURE}
            </p>
          </section>
        </div>
      ) : !needsAuth ? (
        <div className="mt-8 h-64 animate-pulse rounded-3xl bg-[#eee8e0]" />
      ) : null}
    </div>
  );
}

function MatchCard({
  alt,
  originalPrice,
  originalCurrency,
  sourceApp,
  captureId,
}: {
  alt: CaptureResultAltView;
  originalPrice?: number | null;
  originalCurrency?: string | null;
  sourceApp?: string | null;
  captureId?: string;
}) {
  const href = affiliateHref(alt);
  const save =
    !alt.mixedCurrency && originalPrice != null
      ? savingsPercent(originalPrice, parseFloat(String(alt.priceLabel).replace(/[^0-9.]/g, "")) || null)
      : null;

  const body = (
    <>
      {alt.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={alt.imageUrl} alt="" className="aspect-[3/4] w-full bg-[#eee8e0] object-cover object-top" />
      ) : (
        <div className="aspect-[3/4] w-full bg-[#eee8e0]" />
      )}
      <div className="p-3">
        <p className="truncate text-[12px] text-muted-foreground">{alt.brandName || "TX Match"}</p>
        <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">{alt.name}</p>
        {alt.compositionLine ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{alt.compositionLine}</p>
        ) : null}
        <p className="mt-2 text-sm font-semibold">
          {alt.priceLabel}
          {alt.mixedCurrency ? (
            <span className="ml-1 text-[11px] font-medium text-muted-foreground">mixed currency</span>
          ) : null}
        </p>
        {save != null ? (
          <p className="mt-0.5 text-xs font-semibold text-[#3d6b4f]">{save}% less</p>
        ) : null}
        <p className="mt-2 text-xs text-[#1f3d2b]">{shopAtLabel(alt.brandName)}</p>
      </div>
    </>
  );

  if (!href) {
    return <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_24px_rgba(22,20,18,0.06)]">{body}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => logClick({ alt, sourceApp, captureId })}
      className="overflow-hidden rounded-2xl bg-white text-inherit no-underline shadow-[0_10px_24px_rgba(22,20,18,0.06)]"
    >
      {body}
    </a>
  );
}

function logClick(input: {
  alt: CaptureResultAltView;
  sourceApp?: string | null;
  captureId?: string;
}) {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (!token) return;
  const productId = String(input.alt.id || input.captureId || "").trim();
  if (!productId) return;
  const source =
    input.sourceApp === "chrome_extension" || input.sourceApp === "safari_extension"
      ? "chrome_extension"
      : "saved_inspiration";
  void fetch("/api/account/product-clickout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    keepalive: true,
    body: JSON.stringify({
      productId,
      brandName: input.alt.brandName,
      productName: input.alt.name,
      productUrl: input.alt.url,
      source,
    }),
  }).catch(() => null);
}

function affiliateHref(alt: CaptureResultAltView): string | null {
  const raw = String(alt.url || "").trim();
  if (raw.startsWith("http")) {
    const tracked = affiliateUrlWithClientU1(raw);
    const brand = encodeURIComponent(alt.brandName || "partner");
    return `/leaving?brand=${brand}&url=${encodeURIComponent(tracked)}`;
  }
  if (alt.id) return `/product/${encodeURIComponent(alt.id)}`;
  if (alt.brandSlug) return `/brands/${encodeURIComponent(alt.brandSlug)}`;
  return null;
}
