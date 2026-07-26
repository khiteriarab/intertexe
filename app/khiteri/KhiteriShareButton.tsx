"use client";

import { useCallback, useState } from "react";

type Props = {
  title: string;
  url?: string;
};

export function KhiteriShareButton({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async () => {
    const shareUrl =
      url || (typeof window !== "undefined" ? window.location.href : "https://www.intertexe.com/khiteri");
    const shareData = {
      title,
      text: `${title} — natural-fiber picks on INTERTEXE`,
      url: shareUrl,
    };
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user cancelled share */
    }
  }, [title, url]);

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="khiteris-edit__cta khiteris-edit__cta--primary"
      data-testid="button-khiteri-share"
    >
      {copied ? "Link copied" : "Share this edit"}
    </button>
  );
}
