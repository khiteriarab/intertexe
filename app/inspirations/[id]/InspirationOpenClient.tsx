"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { affiliateUrlWithClientU1 } from "@/lib/affiliate-url";

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
  attributes?: { inferred_fiber?: string | null } | null;
};

type TxCopy = {
  decodeAction?: string;
  decodeSupporting?: string;
  alternativesTitle?: string;
  compositionNote?: string | null;
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
    () => (Array.isArray(capture?.alternatives) ? capture!.alternatives! : []),
    [capture]
  );
  const processing =
    capture &&
    !alts.length &&
    ["pending", "enriching", "running", "enrichment_retry"].includes(
      String(capture.enrichment_status || "")
    );

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "linear-gradient(160deg, #f7f3ee 0%, #ebe4da 100%)",
        color: "#1a1a1a",
        fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
      }}
    >
      <div style={{ maxWidth: 520, margin: "40px auto 0" }}>
        <p
          style={{
            margin: 0,
            letterSpacing: "0.12em",
            fontSize: 12,
            textTransform: "uppercase",
            color: "#6b6560",
          }}
        >
          INTERTEXE · Inspiration
        </p>

        {needsAuth ? (
          <div style={{ marginTop: 16 }}>
            <h1 style={{ fontSize: 26 }}>Sign in to view this Inspiration</h1>
            <Link href={`/account?mode=login&next=/inspirations/${captureId}`} style={linkStyle}>
              Sign in to INTERTEXE
            </Link>
          </div>
        ) : null}

        {error ? <p style={{ color: "#8b2e2e" }}>{error}</p> : null}

        {capture ? (
          <article style={{ marginTop: 16 }}>
            {capture.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capture.image_url}
                alt=""
                style={{
                  width: "100%",
                  maxHeight: 420,
                  objectFit: "cover",
                  display: "block",
                  background: "#ddd5cb",
                }}
              />
            ) : null}
            <h1 style={{ fontSize: 24, margin: "14px 0 6px" }}>
              {capture.title || "Saved Inspiration"}
            </h1>
            <p style={{ margin: 0, color: "#6b6560", fontSize: 14 }}>
              {[capture.brand_name, capture.retailer, formatPrice(capture.price, capture.currency)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p style={{ margin: "14px 0 0", fontSize: 15 }}>
              {alts.length
                ? copy?.decodeAction || `See ${alts.length} matches like this`
                : processing
                  ? "Finding more options like this…"
                  : "Saved to Inspirations"}
            </p>
            {copy?.compositionNote ? (
              <p style={{ margin: "8px 0 0", color: "#6b6560", fontSize: 13, lineHeight: 1.45 }}>
                {copy.compositionNote}
              </p>
            ) : null}
            <p style={{ margin: "6px 0 0", color: "#6b6560", fontSize: 13 }}>
              {copy?.decodeSupporting || "More pieces in this fabric, style, and price."}
            </p>
            {capture.original_url ? (
              <p style={{ marginTop: 18 }}>
                <a href={capture.original_url} target="_blank" rel="noreferrer" style={linkStyle}>
                  View original source
                </a>
              </p>
            ) : null}

            {alts.length > 0 ? (
              <section style={{ marginTop: 28 }}>
                <p
                  style={{
                    margin: "0 0 12px",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    fontWeight: 600,
                  }}
                >
                  {copy?.alternativesTitle || "YOUR TX MATCHES"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {alts.map((alt, idx) => (
                    <MatchCard key={String(alt.id || idx)} alt={alt} />
                  ))}
                </div>
              </section>
            ) : null}
          </article>
        ) : !needsAuth && !error ? (
          <p style={{ marginTop: 16, color: "#6b6560" }}>Loading inspiration…</p>
        ) : null}
      </div>
    </main>
  );
}

function MatchCard({ alt }: { alt: CaptureAlt }) {
  const href = affiliateHref(alt);
  const price = formatPrice(
    typeof alt.price === "string" ? parseFloat(alt.price) : alt.price,
    alt.currency
  );
  const body = (
    <>
      {alt.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={alt.image_url}
          alt=""
          style={{ width: 64, height: 80, objectFit: "cover", background: "#ddd5cb" }}
        />
      ) : (
        <div style={{ width: 64, height: 80, background: "#ddd5cb" }} />
      )}
      <div>
        {alt.brand_name ? (
          <p style={{ margin: "0 0 2px", fontSize: 11, color: "#6b6560" }}>{alt.brand_name}</p>
        ) : null}
        <p style={{ margin: "0 0 4px", fontSize: 15, lineHeight: 1.3 }}>
          {alt.name || "TX Match"}
        </p>
        <p style={{ margin: "0 0 4px", fontSize: 12 }}>
          {[price, alt.composition || (alt.natural_fiber_percent != null ? `${Math.round(alt.natural_fiber_percent)}% natural` : null)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {alt.why ? (
          <p style={{ margin: 0, fontSize: 11, color: "#8a837c", lineHeight: 1.4 }}>{alt.why}</p>
        ) : null}
        {href ? (
          <p style={{ margin: "6px 0 0", fontSize: 11, letterSpacing: "0.08em", color: "#1f3d2b" }}>
            SHOP VIA AFFILIATE →
          </p>
        ) : null}
      </div>
    </>
  );

  if (!href) {
    return <div style={cardStyle}>{body}</div>;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}>
      {body}
    </a>
  );
}

/** Prefer catalog/affiliate URL via /leaving (Rakuten u1), else INTERTEXE PDP. */
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

function formatPrice(price?: number | null, currency?: string | null) {
  if (price == null || !Number.isFinite(Number(price))) return null;
  const cur = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(Number(price));
  } catch {
    return `$${price}`;
  }
}

const linkStyle: CSSProperties = {
  color: "#1f3d2b",
  textDecoration: "underline",
};

const cardStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "64px 1fr",
  gap: 12,
  padding: "10px 0",
  borderTop: "1px solid #ddd5cb",
};
