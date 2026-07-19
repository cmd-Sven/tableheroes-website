"use client";

import { useTransition } from "react";
import { Loader2, Map, MapPinOff } from "lucide-react";
import { toast } from "sonner";
import { setActiveBattlemap } from "@/src/lib/actions/battlemap-actions";
import type { SessionBattlemap } from "@/src/lib/session/battlemap-types";

type Props = {
  sessionId: string;
  battlemaps: SessionBattlemap[];
  activeBattlemapId: string | null;
  onActiveChange?: (id: string | null) => void;
};

export function BattlemapGmToolbar({
  sessionId,
  battlemaps,
  activeBattlemapId,
  onActiveChange,
}: Props) {
  const [pending, startTransition] = useTransition();

  if (battlemaps.length === 0) return null;

  function activate(id: string | null) {
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

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-40 flex max-w-[min(100%-1.5rem,20rem)] flex-col gap-2 rounded-xl border border-hero-border/70 bg-background-card/95 p-2 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2 px-1">
        <Map className="h-4 w-4 shrink-0 text-hero-vibrant" aria-hidden />
        <span className="font-barlow text-[10px] font-extrabold uppercase text-hero-vibrant">
          Battlemap
        </span>
        {pending ? <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-gray-400" /> : null}
      </div>
      <select
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
      {activeBattlemapId ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => activate(null)}
          className="inline-flex items-center justify-center gap-1.5 rounded border border-hero-border/50 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-gray-400 hover:border-accent-blood hover:text-accent-blood disabled:opacity-50"
        >
          <MapPinOff className="h-3.5 w-3.5" />
          Map beenden
        </button>
      ) : null}
    </div>
  );
}
