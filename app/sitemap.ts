import type { MetadataRoute } from "next";
import { COLLECTION_SLUGS } from "../lib/collection-pages";

const BASE = "https://www.intertexe.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const materials = ["silk", "cashmere", "linen", "wool", "cotton"] as const;

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/sale`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/designers`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/materials`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/scanner`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/platform`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const collectionPages: MetadataRoute.Sitemap = COLLECTION_SLUGS.map((slug) => ({
    url: `${BASE}/collections/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const materialPages: MetadataRoute.Sitemap = materials.map((fiber) => ({
    url: `${BASE}/materials/${fiber}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...collectionPages, ...materialPages];
}
