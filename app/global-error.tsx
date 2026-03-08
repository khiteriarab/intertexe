"use client";

import { useEffect, useRef } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const resetAttempted = useRef(false);

  useEffect(() => {
    const isHydrationError =
      error.message?.includes("Hydration") ||
      error.message?.includes("hydrat") ||
      error.message?.includes("#418") ||
      error.message?.includes("#423") ||
      error.message?.includes("did not match");

    if (isHydrationError && !resetAttempted.current) {
      resetAttempted.current = true;
      reset();
    }
  }, [error, reset]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", backgroundColor: "#FAFAF8" }}>
        <h2>Something went wrong</h2>
        <button onClick={() => reset()} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
