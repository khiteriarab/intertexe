"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#fafaf8",
          color: "#111",
          textAlign: "center",
          padding: 24,
        }}
      >
        <p style={{ letterSpacing: "0.28em", fontSize: 11, color: "#9a9a9a" }}>INTERTEXE</p>
        <h1 style={{ fontFamily: "ui-serif, Georgia, serif", fontSize: 32, fontWeight: 500 }}>
          The site had trouble loading.
        </h1>
        <p style={{ color: "#666", maxWidth: 420, fontSize: 14 }}>
          This is a temporary error on this page, not a missing website. Try again or open the homepage.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: "1px solid #111",
              background: "transparent",
              padding: "10px 22px",
              letterSpacing: "0.18em",
              fontSize: 10,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: "10px 22px",
              letterSpacing: "0.18em",
              fontSize: 10,
              textTransform: "uppercase",
              color: "#666",
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
