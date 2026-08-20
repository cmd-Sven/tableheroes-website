"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Users } from "lucide-react";

type PreviewItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

type Props = {
  open: boolean;
  onToggle: () => void;
  npcCount: number;
  creatureCount: number;
  factionCount: number;
  previewItems: PreviewItem[];
  children: ReactNode;
};

export function StageRosterCollapse({
  open,
  onToggle,
  npcCount,
  creatureCount,
  factionCount,
  previewItems,
  children,
}: Props) {
  const total = npcCount + creatureCount + factionCount;
  if (total <= 0) return null;

  const parts: string[] = [];
  if (npcCount > 0) parts.push(`${npcCount} NPC${npcCount === 1 ? "" : "s"}`);
  if (creatureCount > 0) {
    parts.push(`${creatureCount} Biest${creatureCount === 1 ? "" : "er"}`);
  }
  if (factionCount > 0) {
    parts.push(`${factionCount} Fraktion${factionCount === 1 ? "" : "en"}`);
  }

  return (
    <div className="rounded-xl border border-amber-900/40 bg-black/35 backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5"
      >
        <Users className="h-4 w-4 shrink-0 text-accent-gold" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-barlow text-[11px] font-bold uppercase tracking-wide text-gray-200">
            Auf der Bühne
          </span>
          <span className="block font-libre text-[10px] text-gray-500">
            {parts.join(" · ")}
          </span>
        </span>
        {!open ? (
          <span className="flex -space-x-2">
            {previewItems.slice(0, 6).map((item) => (
              <span
                key={item.id}
                title={item.name}
                className="relative h-8 w-8 overflow-hidden rounded-full border border-hero-border/70 bg-background-dark"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="32px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center font-barlow text-[10px] font-bold text-accent-gold">
                    {item.name[0]}
                  </span>
                )}
              </span>
            ))}
          </span>
        ) : null}
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        )}
      </button>
      {open ? <div className="space-y-6 border-t border-white/10 px-3 py-3">{children}</div> : null}
    </div>
  );
}
