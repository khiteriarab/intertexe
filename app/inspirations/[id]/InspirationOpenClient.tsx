"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";

const TOKEN_KEY = "intertexe_auth_token";

type Capture = {
  id: string;
  title?: string | null;
  brand_name?: string | null;
  retailer?: string | null;
  image_url?: string | null;
  price?: number | null;
  currency?: string | null;
  original_url?: string | null;
  enrichment_status?: string | null;
  resolution_status?: string | null;
  alternatives?: unknown[] | null;
};

export default function InspirationOpenClient({ captureId }: { captureId: string }) {
  const [capture, setCapture] = useState<Capture | null>(null);
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
        if (!cancelled) setCapture(data.capture || data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [captureId]);

  const alts = Array.isArray(capture?.alternatives) ? capture!.alternatives!.length : 0;
  const processing =
    capture &&
    !alts &&
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
              {alts
                ? `${alts} TX Matches`
                : processing
                  ? "Finding your TX Matches…"
                  : "Saved to Inspirations"}
            </p>
            <p style={{ margin: "6px 0 0", color: "#6b6560", fontSize: 13 }}>
              More like this, made for you.
            </p>
            {capture.original_url ? (
              <p style={{ marginTop: 18 }}>
                <a href={capture.original_url} target="_blank" rel="noreferrer" style={linkStyle}>
                  View original source
                </a>
              </p>
            ) : null}
          </article>
        ) : !needsAuth && !error ? (
          <p style={{ marginTop: 16, color: "#6b6560" }}>Loading inspiration…</p>
        ) : null}
      </div>
    </main>
  );
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
