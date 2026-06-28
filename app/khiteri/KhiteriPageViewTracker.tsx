"use client";

import { useEffect, useRef } from "react";
import { trackEditorialPageView } from "../../lib/analytics";
import { getOrCreateSessionId } from "../../lib/session";

type Props = {
  editSlug: string;
  editMonth: string;
};

async function recordEditorialPageView(params: Props) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("intertexe_auth_token") : null;

  try {
    await fetch("/api/khiteri/track-pageview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        editSlug: params.editSlug,
        editMonth: params.editMonth,
        sessionId: getOrCreateSessionId(),
      }),
    });
  } catch {
    /* non-blocking */
  }
}

export function KhiteriPageViewTracker({ editSlug, editMonth }: Props) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    trackEditorialPageView({ editSlug, editMonth });
    void recordEditorialPageView({ editSlug, editMonth });
  }, [editSlug, editMonth]);

  return null;
}
