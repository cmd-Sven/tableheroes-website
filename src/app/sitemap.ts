import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/src/lib/site-url";
import { getPublicSeoSlugsForSitemap } from "@/src/lib/queries/public-seo-queries";

const STATIC_MARKETING_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/impressum", changeFrequency: "yearly", priority: 0.3 },
  { path: "/datenschutz", changeFrequency: "yearly", priority: 0.3 },
  { path: "/support", changeFrequency: "monthly", priority: 0.5 },
  { path: "/kodex", changeFrequency: "monthly", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicEntries = await getPublicSeoSlugsForSitemap().catch(() => []);

  const staticPages: MetadataRoute.Sitemap = STATIC_MARKETING_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const lorePages: MetadataRoute.Sitemap = publicEntries.map((entry) => ({
    url: absoluteUrl(entry.slug),
    lastModified: entry.publishedAt ? new Date(entry.publishedAt) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...lorePages];
}
