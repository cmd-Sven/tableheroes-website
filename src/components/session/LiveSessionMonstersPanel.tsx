"use client";

import { Check, Skull, X } from "lucide-react";
import { resolveBestariumImageUrl } from "@/src/lib/bestarium-image";

export type LiveSessionMonsterItem = {
  id: string;
  name: string;
  creature_type: string | null;
  image_url: string | null;
  is_revealed?: boolean | null;
};

type Props = {
  onClose: () => void;
  creatures: LiveSessionMonsterItem[];
  activeCreatureIds: Set<string>;
  isGM: boolean;
  onPlaceCreature: (id: string) => void;
  onRemoveCreature?: (id: string) => void;
};

export function LiveSessionMonstersPanel({
  onClose,
  creatures,
  activeCreatureIds,
  isGM,
  onPlaceCreature,
  onRemoveCreature,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between border-b border-amber-900/50 px-3 py-2">
        <div className="min-w-0">
          <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">
            Monster &amp; Gegner
          </h2>
          <p className="font-libre text-[10px] text-gray-500">
            Bestarium aus der Session-Vorbereitung — auf die Bühne legen
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
          aria-label="Monster-Panel schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {creatures.length === 0 ? (
          <p className="font-libre text-xs italic text-gray-500">
            Keine Monster im Bühnendeck. In der Session-Vorbereitung Bestarium-Kreaturen
            auswählen.
          </p>
        ) : (
          <ul className="space-y-2">
            {creatures.map((creature) => {
              const isActive = activeCreatureIds.has(String(creature.id));
              const imageUrl = creature.image_url
                ? resolveBestariumImageUrl(creature.image_url)
                : null;
              return (
                <li
                  key={creature.id}
                  className={`overflow-hidden rounded-lg border ${
                    isActive
                      ? "border-red-500/60 bg-red-950/25"
                      : "border-hero-border/40 bg-hero-dark/25"
                  }`}
                >
                  <div className="flex gap-2 p-2">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded border border-hero-border/30 bg-black/40">
                      {imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-red-950/50">
                          <Skull className="h-5 w-5 text-red-400/80" />
                        </div>
                      )}
                      {isActive ? (
                        <span className="absolute left-1 top-1 rounded bg-red-500 px-1 font-barlow text-[8px] font-bold uppercase text-black">
                          Live
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-cinzel text-sm font-bold text-white">
                        {creature.name}
                      </p>
                      {creature.creature_type ? (
                        <p className="font-barlow text-[9px] uppercase tracking-wide text-red-300/80">
                          {creature.creature_type}
                        </p>
                      ) : null}
                      {isGM ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {!isActive ? (
                            <button
                              type="button"
                              onClick={() => onPlaceCreature(String(creature.id))}
                              className="inline-flex items-center gap-1 rounded border border-red-500/60 px-2 py-0.5 font-barlow text-[9px] font-bold uppercase text-red-300 hover:bg-red-950/40"
                            >
                              <Check className="h-3 w-3" />
                              Auf Bühne
                            </button>
                          ) : onRemoveCreature ? (
                            <button
                              type="button"
                              onClick={() => onRemoveCreature(String(creature.id))}
                              className="inline-flex items-center gap-1 rounded border border-red-500/50 px-2 py-0.5 font-barlow text-[9px] font-bold uppercase text-red-300 hover:bg-red-950/40"
                            >
                              <X className="h-3 w-3" />
                              Entfernen
                            </button>
                          ) : null}
                        </div>
                      ) : isActive ? (
                        <p className="mt-1 font-barlow text-[9px] uppercase text-red-300">
                          Aktuell auf der Bühne
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
