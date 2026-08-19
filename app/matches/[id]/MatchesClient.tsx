"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { affiliateUrlWithClientU1 } from "@/lib/affiliate-url";
import { shopAtLabel } from "@/lib/capture-page-signals";
import { buildCaptureResultView, type CaptureResultAltView } from "@/lib/capture-result";
import { savingsPercent } from "@/lib/material-insight";
import { AFFILIATE_DISCLOSURE } from "@/lib/tx-match-copy";

const TOKEN_KEY = "intertexe_auth_token";

type Capture = Record<string, unknown> & {
  id: string;
  enrichment_status?: string | null;
  original_url?: string | null;
  image_url?: string | null;
  source_app?: string | null;
  price?: number | null;
  currency?: string | null;
  title?: string | null;
  brand_name?: string | null;
  retailer?: string | null;
  composition_text?: string | null;
  alternatives?: unknown[] | null;
};

type LoadState = "loading" | "ready" | "missing" | "malformed" | "failed" | "expired";

function retailerFromAlt(alt: CaptureResultAltView): string {
  try {
    if (alt.url) return new URL(alt.url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  return shopAtLabel(alt.brandName).replace(/^Shop at\s+/i, "");
}

export default function MatchesClient({ captureId }: { captureId: string }) {
  const searchParams = useSearchParams();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const res = await fetch(`/api/matches/${encodeURIComponent(captureId)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 404) {
          setState(data.reason === "malformed" ? "malformed" : "missing");
          setMessage(data.error || "This match set was not found.");
          return;
        }
        if (!res.ok) {
          setState("failed");
          setMessage(data.error || "Could not load matches.");
          return;
        }
        const next = (data.capture || data) as Capture;
        if (!next?.id) {
          setState("missing");
          setMessage("This match set was not found.");
          return;
        }
        setCapture(next);
        setState("ready");
        const nextAlts = Array.isArray(next.alternatives) ? next.alternatives : [];
        const status = String(next.enrichment_status || "");
        const stillProcessing = ["pending", "enriching", "running", "enrichment_retry"].includes(status);
        if (!nextAlts.length && stillProcessing && attempts < 20) {
          attempts += 1;
          timer = window.setTimeout(() => {
            void load();
          }, 2000);
        }
        if (!nextAlts.length && ["failed", "needs_information"].includes(status) && attempts >= 1) {
          setState("expired");
        }
      } catch {
        if (!cancelled) {
          setState("failed");
          setMessage("Could not load matches.");
        }
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
    state === "ready" &&
    Boolean(capture) &&
    (view?.alternatives.length || 0) === 0 &&
    ["pending", "enriching", "running", "enrichment_retry"].includes(
      String(capture?.enrichment_status || "")
    );

  async function saveToAccount() {
    const { hydrateWebAuthToken, getWebAuthToken } = await import("@/lib/web-auth-token");
    const token = (await hydrateWebAuthToken()) || getWebAuthToken();
    const next = `/matches/${captureId}?save=1`;
    if (!token) {
      window.location.assign(`/account?mode=login&next=${encodeURIComponent(next)}`);
      return;
    }
    if (!capture) return;
    setSaving(true);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl: capture.original_url,
          imageUrl: capture.image_url,
          title: capture.title,
          brandName: capture.brand_name,
          retailer: capture.retailer,
          price: capture.price,
          currency: capture.currency,
          compositionText: capture.composition_text,
          sourceApp: "chrome_extension",
          itemType: "external_product",
          decodeNow: false,
        }),
      });
      if (res.status === 401) {
        window.location.assign(`/account?mode=login&next=${encodeURIComponent(next)}`);
        return;
      }
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { hydrateWebAuthToken } = await import("@/lib/web-auth-token");
      await hydrateWebAuthToken();
      if (cancelled) return;
      if (searchParams.get("save") === "1" && capture && localStorage.getItem(TOKEN_KEY) && !saved) {
        void saveToAccount();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture, searchParams]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#191816]">INTERTEXE</p>

      {state === "loading" ? (
        <StatusBlock title="Loading matches…" body="Finding better-material alternatives for this piece." />
      ) : null}
      {state === "malformed" ? (
        <StatusBlock
          title="This match link isn’t valid"
          body="Open INTERTEXE from the Chrome extension on a clothing product to generate a new set."
          actionHref="/"
          actionLabel="Back to INTERTEXE"
        />
      ) : null}
      {state === "missing" ? (
        <StatusBlock
          title="These matches are no longer available"
          body={message || "This match set was not found. Open the extension on the product page to create a new one."}
          actionHref="/"
          actionLabel="Back to INTERTEXE"
        />
      ) : null}
      {state === "failed" ? (
        <StatusBlock
          title="Could not load matches"
          body={message || "Refresh this page, or open the Chrome extension again on the product."}
          actionHref="."
          actionLabel="Try again"
        />
      ) : null}
      {state === "expired" && !view?.alternatives.length ? (
        <StatusBlock
          title="Matches aren’t ready"
          body="We recognized the piece but could not finish alternatives. Open the extension on the product page to try again."
          actionHref="/"
          actionLabel="Back to INTERTEXE"
        />
      ) : null}

      {capture && view && state === "ready" ? (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(260px,340px)_1fr]">
          <article className="overflow-hidden rounded-[14px] border border-[#E6E0D7] bg-white">
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
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#746F68]">This piece</p>
              <h1 className="font-serif mt-2 text-3xl leading-tight text-[#191816]">{view.title}</h1>
              <p className="mt-2 text-sm text-[#191816]">
                {[view.brandLine, view.priceLabel].filter(Boolean).join(" · ")}
              </p>
              <p className="font-serif mt-4 text-xl text-[#191816]">{view.materialHeadline}</p>
              {view.materialDetail ? (
                <p className="mt-2 text-sm text-[#746F68]">{view.materialDetail}</p>
              ) : null}
              {view.materialSupporting ? (
                <p className="mt-2 text-sm text-[#746F68]">{view.materialSupporting}</p>
              ) : null}
              {view.liningNote ? (
                <p className="mt-2 text-sm text-[#746F68]">{view.liningNote}</p>
              ) : null}
              {capture.original_url ? (
                <p className="mt-5 text-sm">
                  <a
                    href={String(capture.original_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1D4734] underline-offset-4 hover:underline"
                  >
                    View original source
                  </a>
                </p>
              ) : null}
            </div>
          </article>

          <section>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#746F68]">
              Better-material matches
            </p>
            <h2 className="font-serif mt-2 text-2xl text-[#191816] md:text-3xl">
              {processing
                ? "Finding other options…"
                : view.alternatives.length
                  ? `${view.alternatives.length} better-material matches`
                  : "Better-material matches"}
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
            ) : processing ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-64 animate-pulse rounded-[14px] bg-[#eee8e0]" />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#746F68]">
                No substitutes were ready for this piece. Keep the original open, or try the extension again.
              </p>
            )}
            <p className="mt-8 text-xs leading-relaxed text-[#746F68]">
              {view.affiliateDisclosure || AFFILIATE_DISCLOSURE}
            </p>

            <div className="mt-10 border-t border-[#E6E0D7] pt-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#746F68]">
                Take your material profile with you
              </p>
              <p className="mt-2 max-w-md text-sm text-[#746F68]">
                Save these matches to INTERTEXE to keep shopping them in the app.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void saveToAccount()}
                  disabled={saving || saved}
                  className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#1D4734] px-5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saved ? "Saved to INTERTEXE" : saving ? "Saving…" : "Save these matches to INTERTEXE"}
                </button>
                <Link
                  href={`/open?next=${encodeURIComponent(`/matches/${captureId}`)}&itx_cta=matches_app`}
                  className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#E6E0D7] px-5 text-sm font-medium text-[#191816]"
                >
                  Open in INTERTEXE app
                </Link>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function StatusBlock({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mt-8 max-w-xl">
      <h1 className="font-serif text-3xl text-[#191816]">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#746F68]">{body}</p>
      {actionHref && actionLabel ? (
        <p className="mt-5">
          <Link href={actionHref} className="text-sm font-semibold text-[#1D4734] underline-offset-4 hover:underline">
            {actionLabel}
          </Link>
        </p>
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
  const retailer = retailerFromAlt(alt);

  const body = (
    <>
      {alt.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={alt.imageUrl} alt="" className="aspect-[3/4] w-full bg-[#eee8e0] object-cover object-top" />
      ) : (
        <div className="aspect-[3/4] w-full bg-[#eee8e0]" />
      )}
      <div className="p-3">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[#746F68]">
          {alt.brandName || "TX Match"}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-[#191816]">{alt.name}</p>
        {alt.compositionLine ? (
          <p className="mt-1 text-xs leading-relaxed text-[#746F68]">{alt.compositionLine}</p>
        ) : null}
        <p className="mt-2 text-sm font-semibold text-[#191816]">
          {alt.priceLabel}
          {alt.mixedCurrency ? (
            <span className="ml-1 text-[11px] font-medium text-[#746F68]">mixed currency</span>
          ) : null}
        </p>
        {retailer ? <p className="mt-1 text-xs text-[#746F68]">{retailer}</p> : null}
        {save != null ? <p className="mt-0.5 text-xs font-semibold text-[#1D4734]">{save}% less</p> : null}
        <p className="mt-2 text-xs font-semibold text-[#1D4734]">{href ? "Shop" : shopAtLabel(alt.brandName)}</p>
      </div>
    </>
  );

  if (!href) {
    return <div className="overflow-hidden rounded-[14px] border border-[#E6E0D7] bg-white">{body}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => logClick({ alt, sourceApp, captureId })}
      className="overflow-hidden rounded-[14px] border border-[#E6E0D7] bg-white text-inherit no-underline"
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
