"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { affiliateUrlWithClientU1 } from "@/lib/affiliate-url";
import { getUniversalOpenUrl } from "@/lib/app-store";
import {
  formatCapturePrice,
  shopAtLabel,
  titleCaseName,
  uniqueTitleCaseNames,
} from "@/lib/capture-page-signals";
import { materialInsightFromText, savingsPercent } from "@/lib/material-insight";
import { AFFILIATE_DISCLOSURE, TX_MATCH_TAGLINE } from "@/lib/tx-match-copy";

const TOKEN_KEY = "intertexe_auth_token";

type CaptureAlt = {
  id?: string;
  name?: string | null;
  brand_name?: string | null;
  brand_slug?: string | null;
  image_url?: string | null;
  url?: string | null;
  price?: number | string | null;
  currency?: string | null;
  composition?: string | null;
  natural_fiber_percent?: number | null;
  why?: string | null;
};

type Capture = {
  id: string;
  title?: string | null;
  brand_name?: string | null;
  retailer?: string | null;
  image_url?: string | null;
  price?: number | null;
  currency?: string | null;
  original_url?: string | null;
  composition_text?: string | null;
  enrichment_status?: string | null;
  alternatives?: CaptureAlt[] | null;
  source_app?: string | null;
};

type TxCopy = {
  decodeAction?: string;
  alternativesTitle?: string;
  compositionHeadline?: string | null;
  compositionDetail?: string | null;
  tagline?: string;
  affiliateDisclosure?: string;
};

/**
 * Destination for "Open in INTERTEXE".
 * Phone: Universal Link opens the app at /capture/{id}.
 * Desktop: keep shopping the saved piece on the web — matches, shop, app.
 */
export default function CaptureOpenClient({ captureId }: { captureId: string }) {
  const [capture, setCapture] = useState<Capture | null>(null);
  const [copy, setCopy] = useState<TxCopy | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const appHref = getUniversalOpenUrl(`/capture/${captureId}`, {
    cta: "chrome_extension_open",
  });
  const matchesHref = `/inspirations/${encodeURIComponent(captureId)}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        if (!cancelled) {
          setCapture(data.capture || data);
          if (data.copy) setCopy(data.copy);
        }
      } catch {
        if (!cancelled) setCapture({ id: captureId });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [captureId]);

  const alts = useMemo(
    () => (Array.isArray(capture?.alternatives) ? capture!.alternatives!.slice(0, 12) : []),
    [capture]
  );
  const insight = materialInsightFromText(
    copy?.compositionHeadline || capture?.composition_text || ""
  );
  const brandLine = capture
    ? uniqueTitleCaseNames(capture.brand_name, capture.retailer).join(" · ")
    : "";
  const priceLabel = capture ? formatCapturePrice(capture.price, capture.currency) : null;

  return (
    <div className="w-full max-w-xl mx-auto py-8 md:py-12">
      <p className="font-serif italic text-2xl text-foreground">INTERTEXE</p>
      <p className="mt-1 text-sm text-muted-foreground">{copy?.tagline || TX_MATCH_TAGLINE}</p>

      {needsAuth ? (
        <div className="mt-8 rounded-3xl bg-white p-6 shadow-[0_18px_40px_rgba(22,20,18,0.08)]">
          <h1 className="font-serif text-3xl">Sign in to keep this piece</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your Inspiration is waiting — open it on the web, in the app, or keep shopping matches.
          </p>
          <Link
            href={`/account?mode=login&next=/capture/${captureId}`}
            className="mt-6 flex h-12 items-center justify-center rounded-full bg-[#1f3d2b] text-sm font-semibold text-white"
          >
            Sign in to INTERTEXE
          </Link>
        </div>
      ) : null}

      {capture ? (
        <article className="mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_18px_40px_rgba(22,20,18,0.08)]">
          {capture.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capture.image_url}
              alt=""
              className="h-72 w-full object-cover bg-[#eee8e0]"
            />
          ) : null}

          <div className="p-5 md:p-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Saved in INTERTEXE
            </p>
            <h1 className="font-serif mt-2 text-3xl leading-tight">
              {titleCaseName(capture.title) || "Your saved piece"}
            </h1>
            <p className="mt-2 text-sm text-[#3f3a36]">
              {[brandLine, priceLabel].filter(Boolean).join(" · ")}
            </p>

            <div className="mt-5 rounded-2xl bg-[#fafaf8] p-4">
              <p
                className={
                  insight.tone === "natural"
                    ? "text-sm font-semibold text-[#3d6b4f]"
                    : insight.tone === "synthetic"
                      ? "text-sm font-semibold text-[#9a5340]"
                      : "text-sm font-semibold text-foreground"
                }
              >
                {insight.label}
              </p>
              {insight.share != null ? (
                <div className="relative mt-3 h-1.5 rounded-full bg-gradient-to-r from-[#3d6b4f] via-[#c4a574] to-[#9a5340]">
                  <span
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#161412] bg-white"
                    style={{ left: `${Math.max(4, Math.min(96, insight.share))}%` }}
                  />
                </div>
              ) : null}
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {copy?.compositionDetail ||
                  copy?.compositionHeadline ||
                  capture.composition_text ||
                  "TX Match can still find similar pieces with verified compositions."}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <a
                href={appHref}
                className="flex h-12 items-center justify-center rounded-full bg-[#1f3d2b] text-sm font-semibold text-white"
              >
                Continue in the INTERTEXE app
              </a>
              <Link
                href={matchesHref}
                className="flex h-12 items-center justify-center rounded-full border border-[#e6dfd6] text-sm font-semibold text-[#1f3d2b]"
              >
                {copy?.decodeAction || "See TX Matches on the web"}
              </Link>
              <Link
                href="/shop"
                className="text-center text-sm text-[#1f3d2b] underline-offset-4 hover:underline"
              >
                Browse INTERTEXE
              </Link>
            </div>

            {alts.length > 0 ? (
              <section className="mt-8">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {(copy?.alternativesTitle || "Top matches").toUpperCase()}
                </p>
                <div className="mt-3 divide-y divide-[#e6dfd6]">
                  {alts.map((alt, idx) => (
                    <MatchRow
                      key={String(alt.id || idx)}
                      alt={alt}
                      originalPrice={capture.price}
                      originalCurrency={capture.currency}
                      originalNatural={insight.share}
                      sourceApp={capture.source_app}
                      captureId={capture.id}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {capture.original_url ? (
              <p className="mt-6 text-sm">
                <a
                  href={capture.original_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1f3d2b] underline-offset-4 hover:underline"
                >
                  View original source
                </a>
              </p>
            ) : null}

            <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
              {copy?.affiliateDisclosure || AFFILIATE_DISCLOSURE}
            </p>
          </div>
        </article>
      ) : !needsAuth ? (
        <div className="mt-8 h-64 animate-pulse rounded-3xl bg-[#eee8e0]" />
      ) : null}
    </div>
  );
}

function MatchRow({
  alt,
  originalPrice,
  originalCurrency,
  originalNatural,
  sourceApp,
  captureId,
}: {
  alt: CaptureAlt;
  originalPrice?: number | null;
  originalCurrency?: string | null;
  originalNatural?: number | null;
  sourceApp?: string | null;
  captureId?: string;
}) {
  const href = affiliateHref(alt);
  const price = formatCapturePrice(
    typeof alt.price === "string" ? parseFloat(alt.price) : alt.price,
    alt.currency
  );
  const save = savingsPercent(
    originalPrice,
    typeof alt.price === "string" ? parseFloat(alt.price) : alt.price
  );
  const sameCurrency =
    originalCurrency &&
    alt.currency &&
    String(originalCurrency).toUpperCase() === String(alt.currency).toUpperCase();
  const moreNatural =
    alt.natural_fiber_percent != null &&
    originalNatural != null &&
    Number(alt.natural_fiber_percent) > originalNatural;

  const body = (
    <>
      {alt.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={alt.image_url} alt="" className="h-20 w-16 rounded-xl object-cover bg-[#eee8e0]" />
      ) : (
        <div className="h-20 w-16 rounded-xl bg-[#eee8e0]" />
      )}
      <div className="min-w-0">
        <p className="truncate text-[13px] text-muted-foreground">
          {titleCaseName(alt.brand_name) || "TX Match"}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">
          {titleCaseName(alt.name) || "Natural-fiber match"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {alt.composition || shopAtLabel(alt.brand_name)}
        </p>
      </div>
      <div className="text-right">
        {price ? <p className="text-sm font-semibold">{price}</p> : null}
        {sameCurrency && save != null ? (
          <p className="mt-0.5 text-xs font-semibold text-[#3d6b4f]">{save}% less</p>
        ) : moreNatural ? (
          <p className="mt-0.5 text-xs font-semibold text-[#3d6b4f]">more natural</p>
        ) : null}
      </div>
    </>
  );

  if (!href) {
    return <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3 py-3">{body}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => logClick({ alt, sourceApp, captureId })}
      className="grid grid-cols-[64px_1fr_auto] items-center gap-3 py-3 text-inherit no-underline"
    >
      {body}
    </a>
  );
}

function logClick(input: { alt: CaptureAlt; sourceApp?: string | null; captureId?: string }) {
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
      brandName: input.alt.brand_name,
      productName: input.alt.name,
      productUrl: input.alt.url,
      price: input.alt.price,
      currency: input.alt.currency,
      naturalFiberPercent: input.alt.natural_fiber_percent,
      source,
    }),
  }).catch(() => null);
}

function affiliateHref(alt: CaptureAlt): string | null {
  const raw = String(alt.url || "").trim();
  if (raw.startsWith("http")) {
    const tracked = affiliateUrlWithClientU1(raw);
    const brand = encodeURIComponent(alt.brand_name || "partner");
    return `/leaving?brand=${brand}&url=${encodeURIComponent(tracked)}`;
  }
  if (alt.id) return `/product/${encodeURIComponent(alt.id)}`;
  if (alt.brand_slug) return `/brands/${encodeURIComponent(alt.brand_slug)}`;
  return null;
}
