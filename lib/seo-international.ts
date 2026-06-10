import type { Metadata } from "next";

export const SITE_URL = "https://www.intertexe.com";

/** Single-language site serving international shoppers — same URL per locale. */
export const HREFLANG_LANGUAGES: Record<string, string> = {
  en: SITE_URL,
  "en-US": SITE_URL,
  "en-GB": SITE_URL,
  "en-AU": SITE_URL,
  es: SITE_URL,
  "es-ES": SITE_URL,
  fr: SITE_URL,
  de: SITE_URL,
  it: SITE_URL,
  "x-default": SITE_URL,
};

export const OG_IMAGE = {
  url: `${SITE_URL}/og-image.jpg`,
  width: 1200,
  height: 630,
  alt: "INTERTEXE — Natural Fiber Fashion Discovery",
};

export const OPEN_GRAPH_LOCALES = ["en_GB", "es_ES", "fr_FR", "de_DE", "it_IT"] as const;

export function pageAlternates(path = ""): NonNullable<Metadata["alternates"]> {
  const canonical = path ? `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}` : SITE_URL;
  const languages = Object.fromEntries(
    Object.keys(HREFLANG_LANGUAGES).map((lang) => [lang, canonical])
  ) as Record<string, string>;
  return { canonical, languages };
}

export const GLOBAL_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};
