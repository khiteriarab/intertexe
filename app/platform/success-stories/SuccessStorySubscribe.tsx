"use client";

import { FormEvent, useState } from "react";

/** Compact newsletter / insights capture for success-story pages. */
export function SuccessStorySubscribe({ storySlug }: { storySlug: string }) {
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting" || state === "done") return;
    setState("submitting");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();
    const language = String(form.get("language") || "en");
    const newsletter = form.get("newsletter") === "on";
    const marketing = form.get("marketing") === "on";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      setMessage("Enter a valid email address.");
      return;
    }
    if (!newsletter) {
      setState("error");
      setMessage("Please confirm you want to receive INTERTEXE insights.");
      return;
    }
    try {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: "Insights",
          last_name: "Reader",
          email,
          company: "Success story newsletter",
          intent: "ebook",
          source_cta: `success_story_${storySlug}`,
          message: `Newsletter opt-in. Language: ${language}. Marketing updates: ${marketing ? "yes" : "no"}.`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMessage(json.error || "Could not subscribe right now.");
        return;
      }
      setState("done");
      setMessage("Thanks — you are on the list.");
    } catch {
      setState("error");
      setMessage("Could not subscribe right now.");
    }
  }

  return (
    <aside className="ss-subscribe">
      <h2 className="ss-subscribe-title">Newsletter subscription</h2>
      <p className="ss-subscribe-lede">Unlock exclusive insights and stay ahead of industry trends.</p>
      {state === "done" ? (
        <p className="ss-subscribe-done" role="status">
          {message}
        </p>
      ) : (
        <form className="ss-subscribe-form" onSubmit={onSubmit} noValidate>
          <label className="ss-subscribe-label">
            Email
            <input
              className="ss-subscribe-input"
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="you@brand.com"
            />
          </label>
          <label className="ss-subscribe-label">
            Preferred language
            <select className="ss-subscribe-input" name="language" defaultValue="en">
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="es">Español</option>
            </select>
          </label>
          <label className="ss-subscribe-check">
            <input type="checkbox" name="newsletter" defaultChecked />
            <span>I agree to receive INTERTEXE insights and success-story updates.</span>
          </label>
          <label className="ss-subscribe-check">
            <input type="checkbox" name="marketing" />
            <span>I also want product and event updates from INTERTEXE.</span>
          </label>
          {state === "error" ? (
            <p className="ss-subscribe-error" role="alert">
              {message}
            </p>
          ) : null}
          <button className="ss-subscribe-submit" type="submit" disabled={state === "submitting"}>
            {state === "submitting" ? "Submitting…" : "Submit"}
          </button>
        </form>
      )}
    </aside>
  );
}
