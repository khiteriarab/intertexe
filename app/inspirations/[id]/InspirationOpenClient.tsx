"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { affiliateUrlWithClientU1 } from "@/lib/affiliate-url";
import {
  formatCapturePrice,
  formatCheckedAt,
  formatCountryName,
  formatMaterialVerdict,
  shopAtLabel,
  titleCaseName,
  uniqueTitleCaseNames,
} from "@/lib/capture-page-signals";
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
  is_editor_pick?: boolean;
  is_sale?: boolean;
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
  resolution_status?: string | null;
  alternatives?: CaptureAlt[] | null;
  created_at?: string | null;
  updated_at?: string | null;
  source_app?: string | null;
  attributes?: { inferred_fiber?: string | null; country?: string | null } | null;
};

type TxCopy = {
  decodeAction?: string;
  decodeSupporting?: string;
  alternativesTitle?: string;
  compositionNote?: string | null;
  compositionHeadline?: string | null;
  compositionDetail?: string | null;
  tagline?: string;
  affiliateDisclosure?: string;
};

export default function InspirationOpenClient({ captureId }: { captureId: string }) {
  const [capture, setCapture] = useState<Capture | null>(null);
  const [copy, setCopy] = useState<TxCopy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

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
        if (!res.ok) throw new Error(data.error || "Could not load inspiration");
        if (!cancelled) {
          setCapture(data.capture || data);
          if (data.copy) setCopy(data.copy);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [captureId]);

  const alts = useMemo(
    () =>
      (Array.isArray(capture?.alternatives) ? capture!.alternatives! : []).filter((a) =>
        /^https?:\/\//i.test(String(a.image_url || ""))
      ),
    [capture]
  );
  const processing =
    capture &&
    !alts.length &&
    ["pending", "enriching", "running", "enrichment_retry"].includes(
      String(capture.enrichment_status || "")
    );

  const brandLine = capture
    ? uniqueTitleCaseNames(capture.brand_name, capture.retailer).join(" · ")
    : "";
  const priceLabel = capture ? formatCapturePrice(capture.price, capture.currency) : null;
  const countryLabel = formatCountryName(capture?.attributes?.country);
  const checkedLabel = formatCheckedAt(capture?.updated_at || capture?.created_at);
  const metaBits = [brandLine, priceLabel].filter(Boolean);
  const trustBits = [countryLabel, checkedLabel].filter(Boolean);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 28,
        background: "linear-gradient(160deg, #f7f3ee 0%, #ebe4da 100%)",
        color: "#161412",
        fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
      }}
    >
      <div style={{ maxWidth: 520, margin: "36px auto 0" }}>
        <p
          style={{
            margin: 0,
            letterSpacing: "0.14em",
            fontSize: 13,
            textTransform: "uppercase",
            color: "#2b2724",
          }}
        >
          INTERTEXE
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#3f3a36", lineHeight: 1.4 }}>
          {copy?.tagline || TX_MATCH_TAGLINE}
        </p>

        {needsAuth ? (
          <div style={{ marginTop: 22 }}>
            <h1 style={{ fontSize: 26 }}>Sign in to view this Inspiration</h1>
            <Link href={`/account?mode=login&next=/inspirations/${captureId}`} style={linkStyle}>
              Sign in to INTERTEXE
            </Link>
          </div>
        ) : null}

        {error ? <p style={{ color: "#8b2e2e", fontSize: 15 }}>{error}</p> : null}

        {capture ? (
          <article style={{ marginTop: 22, animation: "txFade 180ms ease-out" }}>
            {capture.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capture.image_url}
                alt=""
                onError={(e) => {
                  e.currentTarget.remove();
                }}
                style={{
                  width: "100%",
                  maxHeight: 420,
                  objectFit: "cover",
                  display: "block",
                  background: "#ddd5cb",
                }}
              />
            ) : null}
            <h1 style={{ fontSize: 26, margin: "18px 0 8px", lineHeight: 1.25 }}>
              {titleCaseName(capture.title) || "Saved Inspiration"}
            </h1>
            {metaBits.length ? (
              <p style={{ margin: 0, color: "#2b2724", fontSize: 16 }}>
                {metaBits.join(" · ")}
              </p>
            ) : null}
            {trustBits.length ? (
              <p style={{ margin: "6px 0 0", color: "#4a4541", fontSize: 14 }}>
                {trustBits.join(" · ")}
              </p>
            ) : null}

            <section style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #d4cbc0" }}>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  fontWeight: 600,
                  color: "#2b2724",
                }}
              >
                MATERIAL DETAILS
              </p>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.45, color: "#161412" }}>
                {copy?.compositionHeadline ||
                  formatMaterialVerdict(capture.composition_text) ||
                  "Material details unavailable"}
              </p>
              {copy?.compositionDetail ? (
                <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: "#3f3a36" }}>
                  {copy.compositionDetail}
                </p>
              ) : null}
            </section>

            <p style={{ margin: "20px 0 0", fontSize: 16 }}>
              {alts.length
                ? `${alts.length} matches found`
                : processing
                  ? "Finding better-material matches…"
                  : "Saved to Inspirations"}
            </p>
            {alts.length ? (
              <p style={{ margin: "6px 0 0", color: "#3f3a36", fontSize: 14 }}>
                {copy?.decodeSupporting || "More pieces in this fabric, style, and price."}
              </p>
            ) : null}
            {capture.original_url ? (
              <p style={{ marginTop: 18 }}>
                <a href={capture.original_url} target="_blank" rel="noreferrer" style={linkStyle}>
                  View original source
                </a>
              </p>
            ) : null}

            {processing ? <MatchSkeleton /> : null}

            {alts.length > 0 ? (
              <section style={{ marginTop: 32 }}>
                <p
                  style={{
                    margin: "0 0 16px",
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    fontWeight: 600,
                    color: "#2b2724",
                  }}
                >
                  {(copy?.alternativesTitle || "YOUR TX MATCHES").toUpperCase()}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {alts.map((alt, idx) => (
                    <MatchCard
                      key={String(alt.id || idx)}
                      alt={alt}
                      originalPrice={capture.price}
                      originalCurrency={capture.currency}
                      sourceApp={capture.source_app}
                      captureId={capture.id}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <p
              style={{
                margin: "32px 0 0",
                fontSize: 13,
                lineHeight: 1.5,
                color: "#5a5550",
              }}
            >
              {copy?.affiliateDisclosure || AFFILIATE_DISCLOSURE}
            </p>
          </article>
        ) : !needsAuth && !error ? (
          <div style={{ marginTop: 22 }}>
            <MatchSkeleton />
          </div>
        ) : null}
      </div>
      <style>{`@keyframes txFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </main>
  );
}

function MatchSkeleton() {
  return (
    <div aria-hidden="true" style={{ marginTop: 24 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "96px 1fr",
            gap: 16,
            padding: "16px 0",
            borderTop: "1px solid #ddd5cb",
          }}
        >
          <div style={{ width: 96, height: 120, background: "#e4ddd4" }} />
          <div>
            <div style={{ height: 12, width: "40%", background: "#e4ddd4", marginBottom: 10 }} />
            <div style={{ height: 16, width: "78%", background: "#e4ddd4", marginBottom: 10 }} />
            <div style={{ height: 12, width: "55%", background: "#e4ddd4" }} />
          </div>
        </div>
      ))}
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
  alt: CaptureAlt;
  originalPrice?: number | null;
  originalCurrency?: string | null;
  sourceApp?: string | null;
  captureId?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const href = affiliateHref(alt);
  const price = formatCapturePrice(
    typeof alt.price === "string" ? parseFloat(alt.price) : alt.price,
    alt.currency
  );
  const brand = titleCaseName(alt.brand_name);
  const name = titleCaseName(alt.name) || "TX Match";
  const composition = alt.composition
    ? formatMaterialVerdict(alt.composition)
    : alt.natural_fiber_percent != null
      ? `${Math.round(alt.natural_fiber_percent)}% natural`
      : null;
  const savings =
    originalPrice != null &&
    alt.price != null &&
    originalCurrency &&
    alt.currency &&
    String(originalCurrency).toUpperCase() === String(alt.currency).toUpperCase() &&
    Number(alt.price) < Number(originalPrice)
      ? formatCapturePrice(Number(originalPrice) - Number(alt.price), originalCurrency)
      : null;

  const body = (
    <>
      {alt.image_url && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={alt.image_url}
          alt=""
          onError={() => setImgFailed(true)}
          style={{ width: 96, height: 120, objectFit: "cover", background: "#ddd5cb" }}
        />
      ) : (
        <div style={{ width: 96, height: 120, background: "#ddd5cb" }} />
      )}
      <div>
        {brand ? (
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "#3f3a36", letterSpacing: "0.04em" }}>
            {brand}
          </p>
        ) : null}
        <p style={{ margin: "0 0 8px", fontSize: 17, lineHeight: 1.3, color: "#161412" }}>{name}</p>
        <p style={{ margin: "0 0 4px", fontSize: 14, color: "#2b2724" }}>
          {[composition, price].filter(Boolean).join(" · ")}
        </p>
        {alt.why ? (
          <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.4, color: "#5a5550" }}>{alt.why}</p>
        ) : null}
        {savings ? (
          <p style={{ margin: "0 0 8px", fontSize: 14, color: "#1f3d2b" }}>{savings} less</p>
        ) : null}
        {href ? (
          <p style={{ margin: "10px 0 0", fontSize: 14, color: "#1f3d2b" }}>{shopAtLabel(alt.brand_name)}</p>
        ) : null}
      </div>
    </>
  );

  if (!href) {
    return <div style={cardStyle}>{body}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => logInspirationRetailerClick({ alt, sourceApp, captureId })}
      style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}
    >
      {body}
    </a>
  );
}

/** One first-party retailer click before leaving INTERTEXE. */
function logInspirationRetailerClick(input: {
  alt: CaptureAlt;
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

const linkStyle: CSSProperties = {
  color: "#1f3d2b",
  textDecoration: "underline",
  fontSize: 15,
};

const cardStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "96px 1fr",
  gap: 16,
  padding: "16px 0",
  borderTop: "1px solid #d4cbc0",
  animation: "txFade 180ms ease-out",
};
