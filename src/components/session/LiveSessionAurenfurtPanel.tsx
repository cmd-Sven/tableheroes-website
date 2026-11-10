"use client";

import { useEffect, useState, useTransition } from "react";
import { Building2, Loader2, MapPinOff, Unlock, X } from "lucide-react";
import { toast } from "sonner";
import {
  setActiveAurenfurtCity,
  setSessionAurenfurtCityEnabled,
} from "@/src/lib/actions/aurenfurt-session-actions";

type Props = {
  onClose: () => void;
  sessionId: string;
  isGM: boolean;
  /** Freischaltung aus der Bühnenvorbereitung / Session. */
  enabled: boolean;
  active: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  onActiveChange?: (active: boolean) => void;
};

/** GM-Side-Panel: Aurenfurt freischalten und 3D wie Battlemap/Weltkarte aktivieren. */
export function LiveSessionAurenfurtPanel({
  onClose,
  sessionId,
  isGM,
  enabled: enabledProp,
  active,
  onEnabledChange,
  onActiveChange,
}: Props) {
  const [enabled, setEnabled] = useState(enabledProp);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setEnabled(enabledProp);
  }, [enabledProp]);

  function enableForSession() {
    if (!isGM) return;
    startTransition(async () => {
      try {
        await setSessionAurenfurtCityEnabled(sessionId, true);
        setEnabled(true);
        onEnabledChange?.(true);
        toast.success("Aurenfurt für diese Session freigeschaltet.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Freischalten fehlgeschlagen.");
      }
    });
  }

  function setActive(next: boolean) {
    if (!isGM) return;
    startTransition(async () => {
      try {
        await setActiveAurenfurtCity(sessionId, next);
        onActiveChange?.(next);
        toast.success(
          next
            ? "Spieler auf Aurenfurt-Stadtkarte geschoben."
            : "Stadtkarten-Ansicht beendet.",
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Umschalten fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between border-b border-amber-900/50 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-accent-gold" />
          <div>
            <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">
              Aurenfurt
            </h2>
            <p className="font-libre text-[10px] text-gray-500">
              {isGM ? "3D-Stadtkarte für alle" : "Aktive Stadtkarte"}
            </p>
          </div>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" /> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
          aria-label="Aurenfurt-Panel schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {!enabled ? (
          <>
            <p className="rounded-lg border border-hero-border/30 bg-hero-dark/20 p-3 font-libre text-xs text-gray-400">
              Die Stadtsimulation ist für diesen Abend noch nicht freigeschaltet. Danach kannst du
              die 3D-Karte für alle Teilnehmer öffnen — auch schon in der Vorbereitung.
            </p>
            {isGM ? (
              <button
                type="button"
                disabled={pending}
                onClick={enableForSession}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-accent-gold/70 bg-accent-gold/15 px-2 py-2 font-barlow text-[10px] font-bold uppercase text-accent-gold disabled:opacity-50"
              >
                <Unlock className="h-3.5 w-3.5" />
                Stadtsimulation hinzufügen
              </button>
            ) : null}
          </>
        ) : active ? (
          <div className="rounded-lg border border-accent-gold/50 bg-accent-gold/10 p-3">
            <p className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
              Aktiv
            </p>
            <p className="mt-1 font-cinzel text-sm font-bold text-white">
              Stadt Aurenfurt · 3D
            </p>
            <p className="mt-1 font-libre text-[10px] text-gray-400">
              Spieler sehen nur die Karte — kein Dashboard, keine Verwaltung.
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-hero-border/30 bg-hero-dark/20 p-3 font-libre text-xs text-gray-400">
            Freigeschaltet — Stadtkarte noch nicht aktiv. Narrative Bühne bzw. andere Karte
            bleibt sichtbar, bis du umschaltest.
          </p>
        )}

        {isGM && enabled ? (
          <div className="flex flex-col gap-2 border-t border-hero-border/30 pt-3">
            {!active ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => setActive(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded border border-accent-gold/70 bg-accent-gold/15 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold disabled:opacity-50"
              >
                <Building2 className="h-3.5 w-3.5" />
                Stadtkarte aktivieren
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => setActive(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded border border-hero-border/50 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-gray-400 hover:border-accent-blood hover:text-accent-blood disabled:opacity-50"
              >
                <MapPinOff className="h-3.5 w-3.5" />
                Stadtkarte beenden
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
