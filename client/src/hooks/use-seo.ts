import { useEffect } from "react";

const BASE_URL = "https://www.intertexe.com";

export function useSEO({
  title,
  description,
  path,
}: {
  title?: string;
  description?: string;
  path?: string;
}) {
  useEffect(() => {
    if (title) {
      const fullTitle = title.includes("INTERTEXE") ? title : `${title} | INTERTEXE`;
      document.title = fullTitle;

      const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
      if (ogTitle) ogTitle.content = fullTitle;

      const twTitle = document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement;
      if (twTitle) twTitle.content = fullTitle;
    }
    return () => {
      document.title = "INTERTEXE — The Material Standard";
      const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
      if (ogTitle) ogTitle.content = "INTERTEXE";
      const twTitle = document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement;
      if (twTitle) twTitle.content = "INTERTEXE";
    };
  }, [title]);

  useEffect(() => {
    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;

      const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
      if (ogDesc) ogDesc.content = description;

      const twDesc = document.querySelector('meta[name="twitter:description"]') as HTMLMetaElement;
      if (twDesc) twDesc.content = description;
    }
  }, [description]);

  useEffect(() => {
    if (path) {
      const canonicalUrl = `${BASE_URL}${path}`;

      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = canonicalUrl;

      let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement;
      if (!ogUrl) {
        ogUrl = document.createElement("meta");
        ogUrl.setAttribute("property", "og:url");
        document.head.appendChild(ogUrl);
      }
      ogUrl.content = canonicalUrl;
    }
  }, [path]);
}
