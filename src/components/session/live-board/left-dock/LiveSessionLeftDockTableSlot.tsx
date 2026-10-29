/**
 * LiveSessionLeftDockTableSlot — Physical-presence toggles and dummy player seat controls.
 */
"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  setGmConfirmed,
  setGmMarkedAbsent,
} from "@/src/app/dashboard/campaigns/[id]/session-rsvp-actions";
import {
  SESSION_RSVP_CHANGED_BROADCAST,
  type SessionRsvpRosterPlayer,
} from "@/src/app/dashboard/campaigns/[id]/session-rsvp-readiness";
import {
  applyGmConfirmToTerminePlayer,
  applyGmDeclineToTerminePlayer,
} from "@/src/lib/session-rsvp/gm-confirm-optimistic";
import { sendSessionBroadcast } from "@/src/lib/session/realtime-outbox";
import { normalizePhysicallyPresentUserIds } from "../live-session-normalize";
import type { LiveState, PartyCharacter } from "../live-session-types";

type Props = {
  sessionId: string;
  userId: string;
  sessionRsvpRoster: SessionRsvpRosterPlayer[];
  setSessionRsvpRoster?: Dispatch<SetStateAction<SessionRsvpRosterPlayer[]>>;
  partyCharacters: PartyCharacter[];
  physicallyPresentIdSet: Set<string>;
  liveStateRef: MutableRefObject<LiveState | null>;
  updateLiveState: (patch: Partial<LiveState>) => void;
  dummyPlayerCountLive: number;
  isUpdating: boolean;
};

export function LiveSessionLeftDockTableSlot({
  sessionId,
  userId,
  sessionRsvpRoster,
  setSessionRsvpRoster,
  partyCharacters,
  physicallyPresentIdSet,
  liveStateRef,
  updateLiveState,
  dummyPlayerCountLive,
  isUpdating,
}: Props) {
  const router = useRouter();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingKind, setPendingKind] = useState<"dabei" | "abwesend" | null>(null);

  const markPlayer = (player: SessionRsvpRosterPlayer, kind: "dabei" | "abwesend") => {
    if (pendingUserId || !setSessionRsvpRoster) return;
    const previous = sessionRsvpRoster;
    setSessionRsvpRoster((current) =>
      current.map((row) => {
        if (row.userId !== player.userId) return row;
        const next =
          kind === "dabei"
            ? applyGmConfirmToTerminePlayer(row)
            : applyGmDeclineToTerminePlayer(row);
        return {
          ...row,
          ...next,
          characterName: row.characterName,
          canGmManuallyConfirm: !!next.canGmManuallyConfirm,
          canGmManuallyDecline: !!next.canGmManuallyDecline,
        };
      }),
    );
    setPendingUserId(player.userId);
    setPendingKind(kind);
    void (async () => {
      try {
        const res =
          kind === "dabei"
            ? await setGmConfirmed(sessionId, player.userId, true)
            : await setGmMarkedAbsent(sessionId, player.userId);
        if (!res.success) {
          throw new Error(res.error ?? "Speichern fehlgeschlagen.");
        }
        sendSessionBroadcast(SESSION_RSVP_CHANGED_BROADCAST, {
          sessionId,
          senderId: userId,
        });
        toast.success(
          kind === "dabei"
            ? "Spieler als dabei markiert."
            : "Spieler als nicht dabei markiert.",
        );
        router.refresh();
      } catch (err: unknown) {
        setSessionRsvpRoster(previous);
        toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      } finally {
        setPendingUserId(null);
        setPendingKind(null);
      }
    })();
  };

  return (
    <div className="space-y-4">
      {sessionRsvpRoster.length > 0 ? (
        <div className="space-y-2">
          <p className="font-barlow text-[10px] font-extrabold uppercase text-accent-gold">
            Sitzungsteilnahme
          </p>
          <p className="font-libre text-xs leading-relaxed text-gray-300">
            Mündliche Zu- und Absagen hältst du hier fest. Abgemeldete Helden verlassen den Tisch.
          </p>
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {sessionRsvpRoster.map((player) => {
              const busy = pendingUserId === player.userId;
              return (
                <li
                  key={player.userId}
                  className="space-y-2 rounded-lg border border-white/10 bg-background-dark/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-barlow text-sm font-bold text-gray-200">
                      {player.characterName?.trim() || player.username}
                    </span>
                    <span
                      className={`shrink-0 font-libre text-[10px] ${
                        player.status === "offen" ? "text-amber-300" : "text-gray-400"
                      }`}
                    >
                      {player.label}
                    </span>
                  </div>
                  {player.canGmManuallyConfirm || player.canGmManuallyDecline ? (
                    <div className="flex flex-wrap gap-1">
                      {player.canGmManuallyConfirm ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => markPlayer(player, "dabei")}
                          className="inline-flex items-center gap-1 rounded-md border border-accent-gold/40 bg-accent-gold/10 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
                        >
                          {busy && pendingKind === "dabei" ? (
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                          ) : null}
                          Als dabei markieren
                        </button>
                      ) : null}
                      {player.canGmManuallyDecline ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => markPlayer(player, "abwesend")}
                          className="inline-flex items-center gap-1 rounded-md border border-red-800/50 bg-red-950/30 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-red-200 hover:bg-red-950/50 disabled:opacity-50"
                        >
                          {busy && pendingKind === "abwesend" ? (
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                          ) : null}
                          Als nicht dabei markieren
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
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
