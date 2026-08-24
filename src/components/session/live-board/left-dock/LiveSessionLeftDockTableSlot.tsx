/**
 * LiveSessionLeftDockTableSlot — Physical-presence toggles and dummy player seat controls.
 */
"use client";

import type { MutableRefObject } from "react";
import { UserRound } from "lucide-react";
import { normalizePhysicallyPresentUserIds } from "../live-session-normalize";
import type { LiveState, PartyCharacter } from "../live-session-types";

type Props = {
  partyCharacters: PartyCharacter[];
  physicallyPresentIdSet: Set<string>;
  liveStateRef: MutableRefObject<LiveState | null>;
  updateLiveState: (patch: Partial<LiveState>) => void;
  dummyPlayerCountLive: number;
  isUpdating: boolean;
};

export function LiveSessionLeftDockTableSlot({
  partyCharacters,
  physicallyPresentIdSet,
  liveStateRef,
  updateLiveState,
  dummyPlayerCountLive,
  isUpdating,
}: Props) {
  return (
    <div className="space-y-4">
      <p className="font-libre text-xs leading-relaxed text-gray-300">
        Bei Hybridrunden: Wenn jemand physisch am Tisch sitzt, aber keinen Browser offen hat,
        markiere den Charakter hier — das Portrait wird dann nicht mehr ausgegraut.
      </p>
      <ul className="max-h-56 space-y-2 overflow-y-auto">
        {partyCharacters
          .filter((pc) => pc.playerUserId)
          .map((pc) => {
            const uid = String(pc.playerUserId);
            const marked = physicallyPresentIdSet.has(uid);
            return (
              <li
                key={pc.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-background-dark/60 px-3 py-2"
              >
                <span className="min-w-0 truncate font-barlow text-sm font-bold text-gray-200">
                  {pc.name}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={marked}
                  aria-label={
                    marked
                      ? `Markierung „Am Tisch“ für ${pc.name} aufheben`
                      : `${pc.name} als physisch am Tisch anwesend markieren`
                  }
                  onClick={() => {
                    const cur = new Set(
                      normalizePhysicallyPresentUserIds(
                        liveStateRef.current?.physically_present_user_ids,
                      ),
                    );
                    if (cur.has(uid)) cur.delete(uid);
                    else cur.add(uid);
                    updateLiveState({
                      physically_present_user_ids: Array.from(cur),
                    });
                  }}
                  className={`shrink-0 rounded-md border px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase transition-colors ${
                    marked
                      ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                      : "border-white/20 text-gray-400 hover:border-accent-gold hover:text-accent-gold"
                  }`}
                >
                  {marked ? "Markierung aufheben" : "Am Tisch anwesend"}
                </button>
              </li>
            );
          })}
      </ul>
      {partyCharacters.filter((pc) => pc.playerUserId).length === 0 ? (
        <p className="font-libre text-xs text-gray-500">
          Keine Charaktere mit verknüpftem Spieler-Account in der Gruppe.
        </p>
      ) : null}
      <div className="rounded-xl border border-white/15 bg-white/5 p-3 backdrop-blur-md">
        <div className="mb-2 flex items-start gap-2">
          <UserRound className="h-8 w-8 shrink-0 text-accent-gold" aria-hidden />
          <div className="min-w-0">
            <p className="font-barlow text-[10px] font-extrabold uppercase text-accent-gold">
              Platzhalter-Spieler
            </p>
            <p className="font-libre text-[10px] leading-snug text-gray-500">
              Bis zu drei zusätzliche Portraits (Spieler 1–3) ohne Registrierung — nur
              Anzeige, kein Rucksack, kein Chronik-Eintrag.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={dummyPlayerCountLive <= 0 || isUpdating}
            onClick={() =>
              updateLiveState({
                dummy_player_count: Math.max(0, dummyPlayerCountLive - 1),
              })
            }
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/25 bg-background-dark/80 font-barlow text-lg font-bold text-gray-200 hover:border-accent-gold hover:text-accent-gold disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Platzhalter entfernen"
          >
            −
          </button>
          <span className="min-w-[3.5rem] text-center font-barlow text-sm font-extrabold text-accent-gold">
            {dummyPlayerCountLive} / 3
          </span>
          <button
            type="button"
            disabled={dummyPlayerCountLive >= 3 || isUpdating}
            onClick={() =>
              updateLiveState({
                dummy_player_count: Math.min(3, dummyPlayerCountLive + 1),
              })
            }
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/25 bg-background-dark/80 font-barlow text-lg font-bold text-gray-200 hover:border-accent-gold hover:text-accent-gold disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Platzhalter hinzufügen"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
