"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronRight, MapPin, ScrollText, Shield, User } from "lucide-react";
import { toast } from "sonner";
import type { DashboardLoreEntry } from "@/src/lib/types/dashboard-widgets";
import { openKnowledgeSuggestion } from "@/src/lib/actions/knowledge-suggestion-actions";

const PLACEHOLDER =
  "Geheimnisse warten darauf, entdeckt zu werden… Tritt einer Kampagne bei und lass den Spielleiter Einträge freigeben.";

const TYPE_LABEL: Record<DashboardLoreEntry["type"], string> = {
  lore: "Lore",
  npc: "NPC",
  faction: "Fraktion",
  location: "Ort",
};

function getDetailUrl(entry: DashboardLoreEntry): string {
  switch (entry.type) {
    case "npc":
      return `/dashboard/campaigns/${entry.campaignId}/npcs/${entry.id}`;
    case "faction":
      return `/dashboard/campaigns/${entry.campaignId}/factions/${entry.id}`;
    case "location":
    case "lore":
      return `/dashboard/campaigns/${entry.campaignId}/lore/${entry.id}`;
  }
}

function TypeIcon({ type }: { type: DashboardLoreEntry["type"] }) {
  const className = "h-4 w-4 text-accent-gold";
  if (type === "npc") return <User className={className} />;
  if (type === "faction") return <Shield className={className} />;
  if (type === "location") return <MapPin className={className} />;
  return <ScrollText className={className} />;
}

type Props = {
  entry: DashboardLoreEntry | null;
  consumedToday?: boolean;
  viewOnly?: boolean;
};

export function LoreSnippetCard({ entry, consumedToday = false, viewOnly = false }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (!entry) {
    return (
      <div className="w-full p-4">
        <div
          className="rounded-lg border border-hero-border/40 bg-hero-dark/20 p-4 text-center"
          style={{
            backgroundImage: "url('/images/dark-marmor.webp')",
            backgroundSize: "cover",
          }}
        >
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-accent-gold/50" />
          <p className="font-libre text-sm italic text-gray-400">
            {consumedToday
              ? "Du hast den heutigen Eintrag schon angeschaut. Morgen liegt ein neuer bereit."
              : PLACEHOLDER}
          </p>
        </div>
      </div>
    );
  }

  const detailUrl = getDetailUrl(entry);

  const openEntry = async () => {
    if (viewOnly) {
      window.open(detailUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setPending(true);
    const result = await openKnowledgeSuggestion({
      id: entry.id,
      type: entry.type,
      campaignId: entry.campaignId,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    window.open(detailUrl, "_blank", "noopener,noreferrer");
    router.refresh();
  };

  return (
    <div className="w-full p-4">
      <div className="relative overflow-hidden rounded-lg border border-hero-border/40 bg-hero-dark/20 transition-colors hover:border-hero-vibrant/50">
        <div className="relative aspect-[16/10] w-full bg-hero-dark/50">
          {entry.imageUrl ? (
            <Image
              src={entry.imageUrl}
              alt={entry.name}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                backgroundImage: "url('/images/dark-marmor.webp')",
                backgroundSize: "cover",
              }}
            >
              <BookOpen className="h-12 w-12 text-accent-gold/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="mb-1 flex items-center gap-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
              <TypeIcon type={entry.type} />
              {TYPE_LABEL[entry.type]} · {entry.campaignName}
            </p>
            <h3 className="font-cinzel text-lg font-bold text-white drop-shadow-lg">{entry.name}</h3>
          </div>
        </div>
        <div className="p-4 pt-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void openEntry()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-hero-border/50 bg-hero-dark/40 py-2.5 font-barlow text-sm font-bold uppercase text-hero-vibrant transition-colors hover:border-hero-vibrant/60 hover:bg-hero-dark/60 disabled:opacity-60"
          >
            Du möchtest mehr dazu wissen?
            <ChevronRight className="h-4 w-4" />
          </button>
          <p className="mt-2 text-center font-libre text-[11px] text-gray-400">+5 Punkte beim Anschauen</p>
        </div>
      </div>
    </div>
  );
}
