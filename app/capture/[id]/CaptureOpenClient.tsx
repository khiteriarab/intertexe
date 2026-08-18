"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUniversalOpenUrl } from "../../../lib/app-store";
import { titleCaseName, uniqueTitleCaseNames } from "../../../lib/capture-page-signals";
import { TX_MATCH_TAGLINE } from "../../../lib/tx-match-copy";

const TOKEN_KEY = "intertexe_auth_token";

type Capture = {
  id: string;
  title?: string | null;
  brand_name?: string | null;
  retailer?: string | null;
  image_url?: string | null;
};

/**
 * Destination for "Open in INTERTEXE" — not the TX Match list.
 * Phone: Universal Link opens the app at /capture/{id}.
 * Desktop: this page is the saved piece inside INTERTEXE.
 */
export default function CaptureOpenClient({ captureId }: { captureId: string }) {
  const [capture, setCapture] = useState<Capture | null>(null);
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
        if (!cancelled) setCapture(data.capture || data);
      } catch {
        if (!cancelled) setCapture({ id: captureId });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [captureId]);

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
      <div style={{ maxWidth: 420, margin: "48px auto 0" }}>
        <p
          style={{
            margin: 0,
            letterSpacing: "0.12em",
            fontSize: 12,
            textTransform: "uppercase",
            color: "#6b6560",
          }}
        >
          INTERTEXE
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#3f3a36", lineHeight: 1.4 }}>
          {TX_MATCH_TAGLINE}
        </p>
        <h1 style={{ fontSize: 28, margin: "14px 0 8px" }}>Saved in INTERTEXE</h1>
        <p style={{ margin: "0 0 20px", color: "#6b6560", fontSize: 14, lineHeight: 1.45 }}>
          This is your saved piece — not the TX Match list. Open the app to keep shopping it there,
          or view matches on the web.
        </p>

        {needsAuth ? (
          <p style={{ fontSize: 14 }}>
            <Link href={`/account?mode=login&next=/capture/${captureId}`} style={{ color: "#1f3d2b" }}>
              Sign in to INTERTEXE
            </Link>
          </p>
        ) : null}

        {capture?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capture.image_url}
            alt=""
            style={{
              width: "100%",
              maxHeight: 360,
              objectFit: "cover",
              display: "block",
              background: "#ddd5cb",
              marginBottom: 16,
            }}
          />
        ) : null}
        {capture?.title ? (
          <p style={{ fontSize: 18, margin: "0 0 4px" }}>{titleCaseName(capture.title)}</p>
        ) : null}
        {capture?.brand_name || capture?.retailer ? (
          <p style={{ margin: "0 0 20px", color: "#3f3a36", fontSize: 15 }}>
            {uniqueTitleCaseNames(capture.brand_name, capture.retailer).join(" · ")}
          </p>
        ) : null}

        <a
          href={appHref}
          style={{
            display: "block",
            textAlign: "center",
            background: "#1f3d2b",
            color: "#fff",
            padding: "12px 16px",
            textDecoration: "none",
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          Open INTERTEXE app
        </a>
        <Link
          href={matchesHref}
          style={{
            display: "block",
            textAlign: "center",
            color: "#1f3d2b",
            fontSize: 14,
          }}
        >
          View TX Matches on the web
        </Link>
      </div>
    </main>
  );
}
