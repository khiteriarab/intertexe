"use client";

import { useState } from "react";

/** Lightweight share row for success-story detail pages. */
export function SuccessStoryShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function shareUrl(network: "linkedin" | "x" | "facebook") {
    const url = encodeURIComponent(typeof window !== "undefined" ? window.location.href : "");
    const text = encodeURIComponent(title);
    if (network === "linkedin") return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    if (network === "x") return `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
    return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  }

  return (
    <div className="ss-share">
      <p className="ss-share-label">Share this success story</p>
      <div className="ss-share-row">
        <button type="button" className="ss-share-btn" onClick={copyLink} aria-label="Copy link">
          {copied ? "✓" : "↗"}
        </button>
        <a className="ss-share-btn" href={shareUrl("linkedin")} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
          in
        </a>
        <a className="ss-share-btn" href={shareUrl("x")} target="_blank" rel="noopener noreferrer" aria-label="Share on X">
          𝕏
        </a>
        <a className="ss-share-btn" href={shareUrl("facebook")} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
          f
        </a>
      </div>
    </div>
  );
}
