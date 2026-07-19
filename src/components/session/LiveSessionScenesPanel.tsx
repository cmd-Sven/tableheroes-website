"use client";

import { Check, ImageIcon, X } from "lucide-react";
import type { StageSceneMediaItem } from "@/src/components/session/StageSceneCard";

type Props = {
  onClose: () => void;
  scenes: StageSceneMediaItem[];
  activeSceneId: string | null;
  isGM: boolean;
  onShowScene: (id: string) => void;
  onRemoveScene?: (id: string) => void;
};

export function LiveSessionScenesPanel({
  onClose,
  scenes,
  activeSceneId,
  isGM,
  onShowScene,
  onRemoveScene,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between border-b border-amber-900/50 px-3 py-2">
        <div className="min-w-0">
          <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">Szenen</h2>
          <p className="font-libre text-[10px] text-gray-500">
            Mediathek — {isGM ? "Szene auf der Bühne zeigen" : "Aktive Szene & Mediathek"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
          aria-label="Szenen-Panel schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {scenes.length === 0 ? (
          <p className="font-libre text-xs italic text-gray-500">
            Keine Szenen in der Mediathek hinterlegt.
          </p>
        ) : (
          <ul className="space-y-2">
            {scenes.map((scene) => {
              const isActive = String(activeSceneId) === String(scene.id);
              return (
                <li
                  key={scene.id}
                  className={`overflow-hidden rounded-lg border ${
                    isActive
                      ? "border-hero-vibrant/70 bg-hero-vibrant/10"
                      : "border-hero-border/40 bg-hero-dark/25"
                  }`}
                >
                  <div className="flex gap-2 p-2">
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded border border-hero-border/30 bg-black/40">
                      {scene.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={scene.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-accent-gold/60" />
                        </div>
                      )}
                      {isActive ? (
                        <span className="absolute left-1 top-1 rounded bg-hero-vibrant px-1 font-barlow text-[8px] font-bold uppercase text-black">
                          Live
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-cinzel text-sm font-bold text-white">
                        {scene.title}
                      </p>
                      <p className="font-barlow text-[9px] uppercase tracking-wide text-accent-gold/80">
                        {scene.category}
                      </p>
                      {scene.player_notes?.trim() ? (
                        <p className="mt-1 line-clamp-2 font-libre text-[10px] text-gray-400">
                          {scene.player_notes}
                        </p>
                      ) : null}
                      {isGM ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {!isActive ? (
                            <button
                              type="button"
                              onClick={() => onShowScene(String(scene.id))}
                              className="inline-flex items-center gap-1 rounded border border-hero-vibrant/60 px-2 py-0.5 font-barlow text-[9px] font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/15"
                            >
                              <Check className="h-3 w-3" />
                              Zeigen
                            </button>
                          ) : onRemoveScene ? (
                            <button
                              type="button"
                              onClick={() => onRemoveScene(String(scene.id))}
                              className="inline-flex items-center gap-1 rounded border border-red-500/50 px-2 py-0.5 font-barlow text-[9px] font-bold uppercase text-red-300 hover:bg-red-950/40"
                            >
                              <X className="h-3 w-3" />
                              Entfernen
                            </button>
                          ) : null}
                        </div>
                      ) : isActive ? (
                        <p className="mt-1 font-barlow text-[9px] uppercase text-hero-vibrant">
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
