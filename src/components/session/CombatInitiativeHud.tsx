"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Dices, Loader2, Swords, X } from "lucide-react";
import {
  formatInitiativeDisplay,
  parseInitiativeLabel,
  type CombatConditionId,
  type CombatParticipantSide,
} from "@/src/lib/combat-initiative";

export type CombatHudParticipant = {
  id: string;
  name: string;
  type: "player" | "monster" | "npc";
  npc_id?: string | null;
  side: CombatParticipantSide | null;
  initiative_value: number;
  initiative_label?: string | null;
  sort_order: number;
  image_url: string | null;
  is_active: boolean;
  conditions: CombatConditionId[];
};

type Props = {
  participants: CombatHudParticipant[];
  combatStarted: boolean;
  combatRound: number;
  currentTurnIndex: number;
  activeParticipantId: string | null;
  isGM: boolean;
  /** Name des eigenen Spieler-Charakters */
  ownCharacterName?: string | null;
  rollingParticipantId?: string | null;
  onRollInitiative: (participantId: string) => void | Promise<void>;
  onStartCombat: () => void;
  onEndCombat: () => void;
  onEndTurn: () => void | Promise<void>;
  onPrevTurn: () => void;
  onNextTurn: () => void;
  onUpdateInitiative: (participantId: string, label: string) => void | Promise<void>;
};

function hasRolled(p: CombatHudParticipant): boolean {
  return p.initiative_label != null && String(p.initiative_label).trim() !== "";
}

export function CombatInitiativeHud({
  participants,
  combatStarted,
  combatRound,
  currentTurnIndex,
  activeParticipantId,
  isGM,
  ownCharacterName = null,
  rollingParticipantId = null,
  onRollInitiative,
  onStartCombat,
  onEndCombat,
  onEndTurn,
  onPrevTurn,
  onNextTurn,
  onUpdateInitiative,
}: Props) {
  const [initiativeDrafts, setInitiativeDrafts] = useState<Record<string, string>>({});
  const [endingTurn, startEndingTurn] = useTransition();
  const activeRef = useRef<HTMLDivElement | null>(null);

  const allRolled =
    participants.length > 0 && participants.every((p) => hasRolled(p));

  const activeParticipant = useMemo(
    () => participants.find((p) => p.id === activeParticipantId) ?? null,
    [participants, activeParticipantId],
  );

  const isOwnTurn =
    combatStarted &&
    Boolean(ownCharacterName) &&
    activeParticipant?.type === "player" &&
    activeParticipant.name === ownCharacterName;

  useEffect(() => {
    setInitiativeDrafts((prev) => {
      const next = { ...prev };
      for (const p of participants) {
        if (hasRolled(p) && next[p.id] === undefined) {
          next[p.id] = formatInitiativeDisplay(p.initiative_label, p.initiative_value);
        }
      }
      return next;
    });
  }, [participants]);

  useEffect(() => {
    if (!combatStarted || !activeParticipantId) return;
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeParticipantId, combatStarted, combatRound, currentTurnIndex]);

  async function commitInitiative(participant: CombatHudParticipant) {
    const raw =
      initiativeDrafts[participant.id] ??
      formatInitiativeDisplay(participant.initiative_label, participant.initiative_value);
    const parsed = parseInitiativeLabel(raw);
    setInitiativeDrafts((prev) => ({ ...prev, [participant.id]: parsed.display }));
    await onUpdateInitiative(participant.id, parsed.display);
  }

  return (
    <div className="pointer-events-none flex flex-col items-center gap-2">
      <div className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-hero-border/40 bg-background-dark/55 px-3 py-2.5 shadow-2xl backdrop-blur-md">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-accent-gold" />
            <span className="font-barlow text-[11px] font-extrabold uppercase tracking-wide text-accent-gold">
              {combatStarted ? `Kampf · Runde ${combatRound}` : "Initiative"}
            </span>
            {combatStarted && participants.length > 0 ? (
              <span className="font-libre text-[10px] text-gray-400">
                Zug {Math.min(currentTurnIndex + 1, participants.length)} / {participants.length}
              </span>
            ) : (
              <span className="font-libre text-[10px] text-gray-400">
                {participants.filter(hasRolled).length} / {participants.length} gewürfelt
              </span>
            )}
          </div>

          {!combatStarted && isGM ? (
            <button
              type="button"
              disabled={!allRolled}
              onClick={onStartCombat}
              title={
                allRolled
                  ? "Kampf starten"
                  : "Alle Teilnehmer müssen zuerst Initiative würfeln"
              }
              className="rounded-lg border border-hero-vibrant/70 bg-hero-vibrant/20 px-3 py-1.5 font-barlow text-[11px] font-extrabold uppercase tracking-wide text-hero-vibrant shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
            >
              Kampf starten
            </button>
          ) : null}
        </div>

        {participants.length === 0 ? (
          <p className="px-2 py-4 text-center font-libre text-xs text-gray-400">
            Keine Teilnehmer auf der Karte. Der SL kann Tokens über „Am Kampf teilnehmen“
            hinzufügen.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 pt-1">
            {participants.map((participant) => {
              const rolled = hasRolled(participant);
              const active =
                combatStarted && participant.id === activeParticipantId;
              const canRoll =
                !combatStarted &&
                !rolled &&
                (isGM ||
                  (participant.type === "player" &&
                    ownCharacterName != null &&
                    participant.name === ownCharacterName));
              const isRolling = rollingParticipantId === participant.id;
              const ownActive =
                active &&
                participant.type === "player" &&
                ownCharacterName === participant.name;

              return (
                <div
                  key={participant.id}
                  ref={active ? activeRef : undefined}
                  className="relative flex w-[5.25rem] shrink-0 flex-col items-center gap-1"
                >
                  {active ? (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full text-accent-gold"
                      aria-hidden
                    >
                      ▼
                    </motion.span>
                  ) : null}

                  <div
                    className={`relative h-[4.25rem] w-[4.25rem] overflow-hidden rounded-full border-2 bg-black/50 shadow-lg ${
                      active
                        ? "border-accent-gold ring-2 ring-accent-gold/50 ring-offset-2 ring-offset-transparent shadow-[0_0_18px_rgba(202,185,38,0.65)]"
                        : rolled
                          ? "border-hero-vibrant/70"
                          : "border-amber-900/50 opacity-80"
                    }`}
                  >
                    {participant.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={participant.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-hero-dark/60">
                        <span className="font-barlow text-lg font-bold text-accent-gold">
                          {participant.name[0]?.toUpperCase() ?? "?"}
                        </span>
                      </div>
                    )}

                    {isRolling ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                        <Loader2 className="h-6 w-6 animate-spin text-accent-gold" />
                      </div>
                    ) : canRoll ? (
                      <button
                        type="button"
                        onClick={() => void onRollInitiative(participant.id)}
                        title="Initiative würfeln"
                        aria-label={`Initiative für ${participant.name} würfeln`}
                        className="absolute inset-0 flex items-center justify-center bg-black/45 transition-colors hover:bg-black/60"
                      >
                        <span className="flex flex-col items-center gap-0.5">
                          <Dices className="h-6 w-6 text-accent-gold drop-shadow" />
                          <span className="font-barlow text-[8px] font-extrabold uppercase text-accent-gold">
                            Initiative
                          </span>
                        </span>
                      </button>
                    ) : null}
                  </div>

                  <p className="w-full truncate text-center font-barlow text-[10px] font-bold uppercase text-gray-200">
                    {participant.name}
                  </p>

                  {isGM ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={(!rolled && !combatStarted) || isRolling}
                      value={
                        isRolling
                          ? "…"
                          : initiativeDrafts[participant.id] ??
                            (rolled
                              ? formatInitiativeDisplay(
                                  participant.initiative_label,
                                  participant.initiative_value,
                                )
                              : "—")
                      }
                      onChange={(e) =>
                        setInitiativeDrafts((prev) => ({
                          ...prev,
                          [participant.id]: e.target.value,
                        }))
                      }
                      onBlur={() => {
                        if (rolled || combatStarted) void commitInitiative(participant);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      title="Initiative (nur SL)"
                      className="w-12 rounded border border-hero-dark bg-slate-900/90 px-1 py-0.5 text-center font-barlow text-[11px] font-bold text-accent-gold outline-none focus:border-hero-vibrant disabled:opacity-40"
                    />
                  ) : isRolling ? (
                    <span className="font-libre text-[9px] text-accent-gold">…</span>
                  ) : rolled && combatStarted ? null : rolled ? (
                    <span className="font-barlow text-[10px] font-bold text-hero-vibrant">
                      ✓
                    </span>
                  ) : (
                    <span className="font-libre text-[9px] text-gray-500">offen</span>
                  )}

                  {ownActive ? (
                    <button
                      type="button"
                      disabled={endingTurn}
                      onClick={() => startEndingTurn(() => void onEndTurn())}
                      className="mt-0.5 rounded-md border border-accent-gold/70 bg-accent-gold/15 px-2 py-1 font-barlow text-[9px] font-extrabold uppercase tracking-wide text-accent-gold hover:bg-accent-gold/25 disabled:opacity-50"
                    >
                      {endingTurn ? "…" : "Zug beenden"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isGM && combatStarted ? (
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-900/40 bg-background-dark/60 px-2 py-1.5 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={onPrevTurn}
            title="Vorheriger Zug"
            className="grid h-8 w-8 place-items-center rounded-lg border border-hero-border/60 text-gray-200 hover:border-accent-gold hover:text-accent-gold"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextTurn}
            title="Nächster Zug"
            className="grid h-8 w-8 place-items-center rounded-lg border border-hero-border/60 text-gray-200 hover:border-accent-gold hover:text-accent-gold"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onEndCombat}
            title="Kampf beenden"
            className="inline-flex items-center gap-1 rounded-lg border border-red-800/70 bg-red-950/50 px-2.5 py-1.5 font-barlow text-[10px] font-extrabold uppercase tracking-wide text-red-200 hover:border-red-500"
          >
            <X className="h-3.5 w-3.5" />
            Kampf beenden
          </button>
        </div>
      ) : null}
    </div>
  );
}
