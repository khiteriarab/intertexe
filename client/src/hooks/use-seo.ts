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
      document.title = title.includes("INTERTEXE") ? title : `${title} | INTERTEXE`;
    }
    return () => {
      document.title = "INTERTEXE";
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
