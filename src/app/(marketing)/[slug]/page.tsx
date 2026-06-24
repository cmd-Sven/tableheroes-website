import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLoreDetailView } from "@/src/components/public/PublicLoreDetailView";
import { getPublicSeoBySlug } from "@/src/lib/queries/public-seo-queries";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getPublicSeoBySlug(slug);
  if (!entry) {
    return { title: "Eintrag nicht gefunden | Table Heroes" };
  }

  const title = `${entry.name} | Lore-Datenbank | Table Heroes`;
  const description =
    entry.excerpt ||
    `${entry.name} — ${entry.entitySubtype || "Lore"} aus der Kampagne ${entry.campaignName}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://table-heroes.de/${slug}`,
      images: entry.imageUrl ? [{ url: entry.imageUrl, alt: entry.name }] : undefined,
    },
    twitter: {
      card: entry.imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: entry.imageUrl ? [entry.imageUrl] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function PublicSeoEntryPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getPublicSeoBySlug(slug);
  if (!entry) notFound();

  return <PublicLoreDetailView entry={entry} />;
}
