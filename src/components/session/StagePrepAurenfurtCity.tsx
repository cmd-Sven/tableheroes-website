"use client";

import { useState, useTransition } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setSessionAurenfurtCityEnabled } from "@/src/lib/actions/aurenfurt-session-actions";

type Props = {
  sessionId: string;
  initialEnabled: boolean;
};

/** Bühnenvorbereitung: Aurenfurt für den Abend freischalten. */
export function StagePrepAurenfurtCity({ sessionId, initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      try {
        await setSessionAurenfurtCityEnabled(sessionId, next);
        setEnabled(next);
        toast.success(
          next
            ? "Aurenfurt für diese Session freigeschaltet."
            : "Aurenfurt für diese Session deaktiviert.",
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-barlow text-sm font-bold uppercase text-accent-gold">
        <Building2 className="h-4 w-4" />
        Stadtsimulation Aurenfurt
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      </div>
      <p className="font-libre text-sm text-gray-400">
        Wenn aktiv, kannst du schon in der Vorbereitung und später Live auf die 3D-Stadtkarte
        umschalten. Spieler sehen nur die Karte — kein Dashboard und keine Kaiser-Verwaltung.
        Stadtereignisse kannst du bereits im Prep anlegen und auslegen; NPC-Ereigniskarten
        (der gewählten Stadt-NPCs) erst Live.
      </p>
      <label className="flex cursor-pointer items-start gap-3 rounded border border-hero-border/40 bg-background-dark/80 px-3 py-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-0.5 border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
        />
        <span>
          <span className="block font-barlow text-xs font-bold uppercase text-gray-200">
            Stadt Aurenfurt ist für diesen Abend relevant
          </span>
          <span className="mt-0.5 block font-libre text-xs text-gray-500">
            Freischaltung für den Kartenwechsel in der Live Session. Der Lore-Einstieg bleibt
            parallel verfügbar.
          </span>
        </span>
      </label>
    </div>
  );
}
