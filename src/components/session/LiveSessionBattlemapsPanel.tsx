"use client";

import { useTransition } from "react";
import { Loader2, Map, MapPinOff, Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import {
  setActiveBattlemap,
  setBattlemapMovementPaused,
} from "@/src/lib/actions/battlemap-actions";
import type { SessionBattlemap } from "@/src/lib/session/battlemap-types";

type Props = {
  onClose: () => void;
  sessionId: string;
  isGM: boolean;
  battlemaps: SessionBattlemap[];
  activeBattlemapId: string | null;
  movementPaused?: boolean;
  onActiveChange?: (id: string | null) => void;
  onMovementPausedChange?: (paused: boolean) => void;
};

export function LiveSessionBattlemapsPanel({
  onClose,
  sessionId,
  isGM,
  battlemaps,
  activeBattlemapId,
  movementPaused = false,
  onActiveChange,
  onMovementPausedChange,
}: Props) {
  const [pending, startTransition] = useTransition();
  const activeMap = battlemaps.find((m) => m.id === activeBattlemapId) ?? null;

  function activate(id: string | null) {
    if (!isGM) return;
    startTransition(async () => {
      try {
        await setActiveBattlemap(sessionId, id);
        onActiveChange?.(id);
        toast.success(
          id ? "Battlemap aktiviert." : "Battlemap deaktiviert — narrative Bühne.",
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Fehler beim Umschalten.");
      }
    });
  }

  function togglePause() {
    if (!isGM) return;
    const next = !movementPaused;
    startTransition(async () => {
      try {
        await setBattlemapMovementPaused(sessionId, next);
        onMovementPausedChange?.(next);
        toast.success(
          next
            ? "Spieler-Bewegung pausiert."
            : "Spieler dürfen Token wieder bewegen.",
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Pause konnte nicht gesetzt werden.");
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between border-b border-amber-900/50 px-3 py-2">
        <div className="min-w-0 flex items-center gap-2">
          <Map className="h-4 w-4 shrink-0 text-hero-vibrant" />
          <div>
            <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">
              Battlemaps
            </h2>
            <p className="font-libre text-[10px] text-gray-500">
              {isGM ? "Karte für alle aktivieren" : "Aktive Karte der Session"}
            </p>
          </div>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" /> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
          aria-label="Battlemaps-Panel schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
        {activeMap ? (
          <div className="rounded-lg border border-hero-vibrant/50 bg-hero-vibrant/10 p-3">
            <p className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
              Aktiv
            </p>
            <p className="mt-1 font-cinzel text-sm font-bold text-white">{activeMap.title}</p>
            {movementPaused ? (
              <p className="mt-1 font-libre text-[10px] text-accent-gold">
                Spieler-Bewegung pausiert
              </p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-hero-border/30 bg-hero-dark/20 p-3 font-libre text-xs text-gray-400">
            Keine Battlemap aktiv — narrative Bühne.
          </p>
        )}

        {isGM ? (
          <>
            <div>
              <label
                htmlFor="live-battlemap-select"
                className="mb-1 block font-barlow text-[10px] font-bold uppercase text-gray-400"
              >
                Karte wählen
              </label>
              <select
                id="live-battlemap-select"
                value={activeBattlemapId ?? ""}
                disabled={pending}
                onChange={(e) => activate(e.target.value || null)}
                className="w-full rounded border border-hero-border bg-slate-900/90 px-2 py-1.5 text-xs text-white"
              >
                <option value="">Narrative Bühne (keine Map)</option>
                {battlemaps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            {battlemaps.length === 0 ? (
              <p className="font-libre text-xs italic text-gray-500">
                Noch keine Battlemaps für diese Session angelegt.
              </p>
            ) : (
              <ul className="space-y-2">
                {battlemaps.map((m) => {
                  const isActive = m.id === activeBattlemapId;
                  return (
                    <li
                      key={m.id}
                      className={`flex items-center justify-between gap-2 rounded border px-3 py-2 ${
                        isActive
                          ? "border-hero-vibrant/60 bg-hero-vibrant/10"
                          : "border-hero-border/30 bg-hero-dark/20"
                      }`}
                    >
                      <span className="min-w-0 truncate font-barlow text-xs font-bold text-gray-200">
                        {m.title}
                      </span>
                      {!isActive ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => activate(m.id)}
                          className="shrink-0 rounded border border-hero-vibrant/60 px-2 py-0.5 font-barlow text-[9px] font-bold uppercase text-hero-vibrant disabled:opacity-40"
                        >
                          Aktivieren
                        </button>
                      ) : (
                        <span className="shrink-0 font-barlow text-[9px] uppercase text-hero-vibrant">
                          Live
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {activeBattlemapId ? (
              <div className="flex flex-col gap-2 border-t border-hero-border/30 pt-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={togglePause}
                  className={`inline-flex items-center justify-center gap-1.5 rounded border px-2 py-1.5 font-barlow text-[10px] font-bold uppercase disabled:opacity-50 ${
                    movementPaused
                      ? "border-accent-gold/70 bg-accent-gold/15 text-accent-gold"
                      : "border-hero-border/50 text-gray-400 hover:border-hero-vibrant hover:text-hero-vibrant"
                  }`}
                >
                  {movementPaused ? (
                    <Play className="h-3.5 w-3.5" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                  {movementPaused ? "Bewegung freigeben" : "Spieler pausieren"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => activate(null)}
                  className="inline-flex items-center justify-center gap-1.5 rounded border border-hero-border/50 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-gray-400 hover:border-accent-blood hover:text-accent-blood disabled:opacity-50"
                >
                  <MapPinOff className="h-3.5 w-3.5" />
                  Map beenden
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
