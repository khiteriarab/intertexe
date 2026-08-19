"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { affiliateUrlWithClientU1 } from "@/lib/affiliate-url";
import { buildCaptureResultView, type CaptureResultAltView } from "@/lib/capture-result";
import { AFFILIATE_DISCLOSURE } from "@/lib/tx-match-copy";
import {
  TX_MATCH_SORTS,
  matchHeroCopy,
  originalPieceLabel,
  sortTxMatches,
  type TxMatchSort,
} from "@/lib/tx-match-display";

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
  category?: string | null;
  subcategory?: string | null;
  alternatives?: unknown[] | null;
};

type LoadState = "loading" | "ready" | "missing" | "malformed" | "failed" | "expired";

export default function MatchesClient({ captureId }: { captureId: string }) {
  const searchParams = useSearchParams();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sort, setSort] = useState<TxMatchSort>("best");
  const [query, setQuery] = useState("");

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
  const hero = useMemo(
    () =>
      matchHeroCopy({
        title: view?.title || (capture?.title ? String(capture.title) : null),
        brandName: capture?.brand_name ? String(capture.brand_name) : view?.brandLine || null,
        category: String(capture?.subcategory || capture?.category || ""),
        altCount: view?.alternatives.length || 0,
      }),
    [capture, view]
  );
  const sorted = useMemo(() => {
    const alts = view?.alternatives || [];
    return sortTxMatches(alts, sort, typeof capture?.price === "number" ? capture.price : null);
  }, [view, sort, capture?.price]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((alt) => {
      const hay = `${alt.brandName || ""} ${alt.name || ""} ${alt.compositionLine || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sorted, query]);
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

  const originalName = originalPieceLabel(
    capture?.brand_name ? String(capture.brand_name) : null,
    view?.title || null
  );

  return (
    <div className="bg-[#FAFAF8] text-[#111111]">
      {state === "loading" ? (
        <StatusBlock title="Finding matches…" body="Keeping the original piece in context." />
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
          body={message || "Open the extension on the product page to create a new set."}
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
        <main className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-10 md:px-8 md:pt-14">
          <header className="max-w-3xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#111111]/55">
              TX Match · {hero.eyebrow}
            </p>
            <h1 className="font-serif mt-4 text-[2.15rem] leading-[1.12] tracking-[-0.02em] text-[#111111] md:text-5xl">
              {hero.heading}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#111111]/65">{hero.supporting}</p>
          </header>

          <aside className="mt-10 flex max-w-2xl items-center gap-4 border-y border-[#111111]/10 py-4">
            {capture.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={String(capture.image_url)}
                alt=""
                className="h-[88px] w-[70px] shrink-0 object-cover object-top"
              />
            ) : (
              <div className="h-[88px] w-[70px] shrink-0 bg-[#EEEAE3]" />
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#111111]/45">
                Your original find
              </p>
              <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.12em] text-[#111111]">
                {capture.brand_name ? String(capture.brand_name) : "Original"}
              </p>
              <p className="mt-0.5 truncate text-sm text-[#111111]/80">{view.title}</p>
              <p className="mt-1 text-[13px] text-[#111111]/55">
                {view.compositionEditorial || view.materialHeadline}
              </p>
            </div>
          </aside>

          <nav
            className="-mx-4 mt-8 flex gap-6 overflow-x-auto px-4 md:mx-0 md:px-0"
            aria-label="Match controls"
          >
            {TX_MATCH_SORTS.map((item) => {
              const active = sort === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSort(item.id)}
                  className={`shrink-0 border-b pb-2 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors ${
                    active
                      ? "border-[#111111] text-[#111111]"
                      : "border-transparent text-[#111111]/40 hover:text-[#111111]/70"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <label className="mt-6 block max-w-md">
            <span className="sr-only">Search these matches</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search these matches"
              className="h-11 w-full border border-[#111111]/15 bg-white px-3 text-sm text-[#111111] placeholder:text-[#111111]/35"
            />
          </label>

          {visible.length > 0 ? (
            <section className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
              {visible.map((alt) => (
                <MatchCard
                  key={alt.id}
                  alt={alt}
                  sourceApp={capture.source_app ? String(capture.source_app) : null}
                  captureId={capture.id}
                />
              ))}
            </section>
          ) : processing ? (
            <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-[3/4] animate-pulse bg-[#EEEAE3]" />
              ))}
            </section>
          ) : (
            <p className="mt-10 max-w-md text-sm leading-relaxed text-[#111111]/55">
              {query.trim()
                ? "No matches in this set for that search. Clear search to see the full list."
                : sort === "pure"
                ? "No fully natural substitutes in this set. Try More Natural, or keep Best Match."
                : "No substitutes were ready for this piece. Keep the original open, or try the extension again."}
            </p>
          )}

          <p className="mt-14 max-w-lg text-[11px] leading-relaxed text-[#111111]/40">
            {view.affiliateDisclosure || AFFILIATE_DISCLOSURE}
          </p>

          <section className="mt-20 max-w-xl border-t border-[#111111]/10 pt-10">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#111111]/45">TX Match</p>
            <h2 className="font-serif mt-3 text-3xl tracking-[-0.02em] text-[#111111]">
              Your wardrobe. Better materials.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#111111]/60">
              Set your preferred fibers and synthetic tolerance to make future INTERTEXE matches even more personal.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/quiz"
                className="inline-flex h-11 items-center justify-center bg-[#1D4734] px-5 text-[12px] font-medium uppercase tracking-[0.14em] text-white"
              >
                Personalize my matches
              </Link>
              <Link
                href={`/open?next=${encodeURIComponent(`/matches/${captureId}`)}&itx_cta=matches_app`}
                className="inline-flex h-11 items-center justify-center border border-[#111111]/20 px-5 text-[12px] font-medium uppercase tracking-[0.14em] text-[#111111]"
              >
                Open in INTERTEXE
              </Link>
              <button
                type="button"
                onClick={() => void saveToAccount()}
                disabled={saving || saved}
                className="inline-flex h-11 items-center justify-center px-2 text-[12px] font-medium uppercase tracking-[0.14em] text-[#111111]/55 underline-offset-4 hover:underline disabled:opacity-60"
              >
                {saved ? "Saved" : saving ? "Saving…" : `Save ${originalName ? "this find" : "these matches"}`}
              </button>
            </div>
          </section>
        </main>
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
    <div className="mx-auto max-w-[1280px] px-4 py-20 md:px-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#111111]/45">TX Match</p>
      <h1 className="font-serif mt-4 text-3xl tracking-[-0.02em] text-[#111111]">{title}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[#111111]/60">{body}</p>
      {actionHref && actionLabel ? (
        <p className="mt-6">
          <Link href={actionHref} className="text-sm text-[#1D4734] underline-offset-4 hover:underline">
            {actionLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function MatchCard({
  alt,
  sourceApp,
  captureId,
}: {
  alt: CaptureResultAltView;
  sourceApp?: string | null;
  captureId?: string;
}) {
  const href = affiliateHref(alt);
  const reasons = alt.whyReasons.filter(Boolean).slice(0, 3);
  const body = (
    <>
      <div className="relative aspect-[3/4] overflow-hidden bg-[#EEEAE3]">
        {alt.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={alt.imageUrl} alt="" className="h-full w-full object-cover object-top" />
        ) : null}
        {reasons.length ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3 pt-12 text-left text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">Why this match</p>
            <ul className="mt-1.5 space-y-0.5 text-[12px] leading-snug">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="pt-3">
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-[#111111]">
          {alt.brandName || "TX Match"}
        </p>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#111111]/70">{alt.name}</p>
        <p className="mt-1.5 text-[13px] text-[#111111]">{alt.priceLabel}</p>
        {alt.compositionLine ? (
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#111111]/50">{alt.compositionLine}</p>
        ) : null}
        {alt.cardSignal ? (
          <p className="mt-2 text-[11px] font-medium tracking-[0.01em] text-[#1D4734]">{alt.cardSignal}</p>
        ) : null}
        {reasons.length ? (
          <details className="mt-2 md:hidden">
            <summary className="cursor-pointer text-[11px] uppercase tracking-[0.12em] text-[#111111]/40">
              Why this match
            </summary>
            <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-[#111111]/60">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </>
  );

  if (!href) {
    return <div className="group text-left">{body}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => logClick({ alt, sourceApp, captureId })}
      className="group text-left text-inherit no-underline"
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
