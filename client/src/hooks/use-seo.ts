import { useEffect } from "react";

export function useSEO({
  title,
  description,
}: {
  title?: string;
  description?: string;
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
      document.title = "INTERTEXE";
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
}
