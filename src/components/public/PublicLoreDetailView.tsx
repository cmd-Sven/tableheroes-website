import Image from "next/image";
import Link from "next/link";
import { Sparkles, BookOpen, Users, Shield } from "lucide-react";
import { SmartText } from "@/src/components/ui/SmartText";
import { AI_IMAGE_ATTRIBUTION_TEXT } from "@/src/lib/image-attribution";
import type { PublicSeoDetail } from "@/src/lib/public-seo-types";

const TYPE_LABELS = {
  lore: "Lore",
  npc: "NSC",
  faction: "Fraktion",
} as const;

const TYPE_ICONS = {
  lore: BookOpen,
  npc: Users,
  faction: Shield,
} as const;

type Props = {
  entry: PublicSeoDetail;
};

export function PublicLoreDetailView({ entry }: Props) {
  const Icon = TYPE_ICONS[entry.entityType];

  return (
    <article className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      <header className="mb-8 space-y-4">
        <Link
          href="/"
          className="inline-flex text-sm text-gray-400 hover:text-accent-gold font-barlow uppercase tracking-wide"
        >
          ← Table Heroes
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-accent-gold/90 font-barlow">
          <Icon className="h-4 w-4" />
          <span>{TYPE_LABELS[entry.entityType]}</span>
          {entry.entitySubtype ? (
            <>
              <span className="text-gray-600">·</span>
              <span>{entry.entitySubtype}</span>
            </>
          ) : null}
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">{entry.campaignName}</span>
        </div>
        <h1 className="font-cinzel text-3xl md:text-5xl text-hero-vibrant leading-tight">
          {entry.name}
        </h1>
      </header>

      {entry.imageUrl ? (
        <div className="relative mb-8 aspect-[21/9] max-h-[420px] w-full overflow-hidden rounded-2xl border border-hero-border bg-black/40">
          <Image
            src={entry.imageUrl}
            alt={entry.name}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            unoptimized
          />
          {entry.imageIsAiGenerated ? (
            <p className="absolute bottom-3 right-3 max-w-[min(100%-1.5rem,20rem)] rounded bg-black/75 px-2 py-1 text-[11px] text-gray-300 text-right">
              <Sparkles className="inline h-3.5 w-3.5 text-accent-gold/80 mr-1" />
              {AI_IMAGE_ATTRIBUTION_TEXT}
            </p>
          ) : null}
        </div>
      ) : null}

      {entry.description?.trim() ? (
        <section className="prose prose-invert max-w-none font-libre text-gray-200 mb-8">
          <SmartText text={entry.description} entities={[]} />
        </section>
      ) : null}

      {entry.sections.map((section) =>
        section.body?.trim() ? (
          <section key={section.title} className="mb-8">
            <h2 className="font-cinzel text-xl text-accent-gold mb-3">{section.title}</h2>
            <div className="prose prose-invert max-w-none font-libre text-gray-300">
              <SmartText text={section.body} entities={[]} />
            </div>
          </section>
        ) : null,
      )}

      <footer className="mt-12 pt-6 border-t border-hero-border/50 text-sm text-gray-500 font-libre">
        <p>
          Eintrag aus der Lore-Datenbank der Kampagne{" "}
          <span className="text-gray-400">{entry.campaignName}</span> auf Table Heroes.
          Veröffentlicht mit Zustimmung des Spielleiters.
        </p>
      </footer>
    </article>
  );
}
