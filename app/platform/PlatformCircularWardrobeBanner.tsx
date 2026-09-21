"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { trackPlatform } from "../../lib/platform-analytics";
import { SERIF } from "./platform-ui";

export const PLATFORM_EBOOK_HREF = "/platform/intertexe-software-guide.html";

/**
 * Closing conversion band — download the INTERTEXE software guide,
 * then continue to request a demo. Black surface with gold brand accents.
 */
export function PlatformCircularWardrobeBanner() {
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting" || state === "done") return;
    setState("submitting");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          intent: "ebook",
          source_cta: "platform_ebook",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMessage(json.error || "Could not start your download.");
        return;
      }
      trackPlatform("platform_ebook_download");
      setState("done");
      window.open(PLATFORM_EBOOK_HREF, "_blank", "noopener,noreferrer");
    } catch {
      setState("error");
      setMessage("Could not start your download.");
    }
  }

  return (
    <section className="platform-ebook-section" id="ebook" aria-labelledby="platform-ebook-title">
      <div className="platform-ebook-card">
        <div className="platform-ebook-copy">
          <p className="platform-ebook-eyebrow">INTERTEXE platform</p>
          <h2 id="platform-ebook-title" className="platform-ebook-title" style={SERIF}>
            <em>Ebook</em> download
          </h2>
          <p className="platform-ebook-sub">
            A practical guide to using INTERTEXE software — from governed product records to Digital Product
            Passports, consumer delivery, and resale.
          </p>
        </div>

        {state === "done" ? (
          <div className="platform-ebook-success">
            <p>Your guide is ready. If it did not open, use the link below.</p>
            <a href={PLATFORM_EBOOK_HREF} className="platform-ebook-submit" target="_blank" rel="noopener noreferrer">
              Open the guide
            </a>
            <Link href="/brands/request?intent=snapshot&cta=ebook_demo" className="platform-ebook-demo">
              Request a demo →
            </Link>
          </div>
        ) : (
          <form className="platform-ebook-form" onSubmit={onSubmit} noValidate={false}>
            <input name="company_fax" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

            <div className="platform-ebook-fields">
              <label className="platform-ebook-label">
                Work email*
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  className="platform-ebook-input"
                  placeholder="you@brand.com"
                />
              </label>
              <label className="platform-ebook-label">
                Company*
                <input
                  required
                  name="company"
                  autoComplete="organization"
                  className="platform-ebook-input"
                  placeholder="Your brand"
                />
              </label>
              <label className="platform-ebook-label">
                First name*
                <input required name="first_name" autoComplete="given-name" className="platform-ebook-input" />
              </label>
              <label className="platform-ebook-label">
                Last name*
                <input required name="last_name" autoComplete="family-name" className="platform-ebook-input" />
              </label>
            </div>

            <label className="platform-ebook-check">
              <input required type="checkbox" name="consent" value="yes" />
              <span>I agree to receive this INTERTEXE software guide and related product updates.</span>
            </label>

            <p className="platform-ebook-privacy">
              INTERTEXE processes this information to send your guide and follow up on platform interest. See our{" "}
              <a href="/privacy">Privacy Policy</a>.
            </p>

            {state === "error" ? <p className="platform-ebook-error">{message}</p> : null}

            <button type="submit" className="platform-ebook-submit" disabled={state === "submitting"}>
              {state === "submitting" ? "Preparing…" : "Download the guide"}
            </button>

            <Link href="/brands/request?intent=snapshot&cta=request_demo" className="platform-ebook-demo">
              Request a demo →
            </Link>
          </form>
        )}
      </div>
    </section>
  );
}
