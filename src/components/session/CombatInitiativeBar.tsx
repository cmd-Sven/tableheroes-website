"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { DragEvent } from "react";
import { X } from "lucide-react";
import {
  formatInitiativeDisplay,
  parseInitiativeLabel,
  type CombatConditionId,
  type CombatParticipantSide,
} from "@/src/lib/combat-initiative";
import { ConditionIconBadge } from "@/src/components/session/combat-condition-icons";
import { ConditionPickerModal } from "@/src/components/session/ConditionPickerModal";

export type CombatInitiativeParticipant = {
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
  participants: CombatInitiativeParticipant[];
  activeParticipantId: string | null;
  combatRound: number;
  currentTurnIndex: number;
  isGM: boolean;
  onNextTurn: () => void;
  onUpdateParticipant: (
    id: string,
    patch: Partial<
      Pick<
        CombatInitiativeParticipant,
        "initiative_value" | "initiative_label" | "is_active" | "conditions" | "side"
      >
    >,
  ) => void | Promise<void>;
  onDropToken: (event: DragEvent<HTMLDivElement>) => void;
};

const TOKEN_SIZE_CLASS = "h-[4.375rem] w-[4.375rem]";

function getTokenRingClasses(
  participant: CombatInitiativeParticipant,
  active: boolean,
  isDead: boolean,
): string {
  if (isDead) {
    return "opacity-45 grayscale border-red-900/70";
  }

  if (participant.side === "friend") {
    return active
      ? "border-emerald-400 ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-background-dark shadow-[0_0_16px_rgba(34,197,94,0.65)]"
      : "border-emerald-500/80 shadow-[0_0_12px_rgba(34,197,94,0.45)]";
  }

  if (participant.side === "nemesis") {
    return active
      ? "border-red-500 ring-2 ring-red-500/50 ring-offset-2 ring-offset-background-dark shadow-[0_0_16px_rgba(239,68,68,0.65)]"
      : "border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.45)]";
  }

  if (active) {
    return "border-accent-gold ring-2 ring-accent-gold/45 ring-offset-2 ring-offset-background-dark shadow-[0_0_14px_rgba(202,185,38,0.55)]";
  }

  return "border-amber-900/70";
}

function canCycleSide(type: CombatInitiativeParticipant["type"]): boolean {
  return type === "npc" || type === "monster";
}

function nextSide(current: CombatParticipantSide | null): CombatParticipantSide | null {
  if (current === null) return "friend";
  if (current === "friend") return "nemesis";
  return null;
}

function sideCycleTitle(side: CombatParticipantSide | null): string {
  if (side === null) return "Klicken: Friend";
  if (side === "friend") return "Friend — Klicken: Nemesis";
  return "Nemesis — Klicken: Neutral";
}

export function CombatInitiativeBar({
  participants,
  activeParticipantId,
  combatRound,
  currentTurnIndex,
  isGM,
  onNextTurn,
  onUpdateParticipant,
  onDropToken,
}: Props) {
  const [initiativeDrafts, setInitiativeDrafts] = useState<Record<string, string>>({});
  const [conditionPickerId, setConditionPickerId] = useState<string | null>(null);

  const conditionPickerParticipant = useMemo(
    () => participants.find((p) => p.id === conditionPickerId) ?? null,
    [participants, conditionPickerId],
  );

  const safeTurnIndex = participants.length
    ? Math.min(Math.max(0, currentTurnIndex), participants.length - 1)
    : 0;

  useEffect(() => {
    setInitiativeDrafts((prev) => {
      const next = { ...prev };
      for (const p of participants) {
        if (next[p.id] === undefined) {
          next[p.id] = formatInitiativeDisplay(p.initiative_label, p.initiative_value);
        }
      }
      return next;
    });
  }, [participants]);

  async function commitInitiative(participant: CombatInitiativeParticipant) {
    const raw =
      initiativeDrafts[participant.id] ??
      formatInitiativeDisplay(participant.initiative_label, participant.initiative_value);
    const parsed = parseInitiativeLabel(raw);
    setInitiativeDrafts((prev) => ({ ...prev, [participant.id]: parsed.display }));
    await onUpdateParticipant(participant.id, {
      initiative_label: parsed.display,
      initiative_value: parsed.base,
    });
  }

  function toggleCondition(participantId: string, id: CombatConditionId) {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;
    const set = new Set(participant.conditions);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    void onUpdateParticipant(participantId, { conditions: Array.from(set) });
  }

  function cycleParticipantSide(participant: CombatInitiativeParticipant) {
    if (!isGM || !canCycleSide(participant.type)) return;
    void onUpdateParticipant(participant.id, { side: nextSide(participant.side) });
  }

  return (
    <div className="relative">
      <ConditionPickerModal
        open={Boolean(conditionPickerId && isGM && conditionPickerParticipant)}
        participant={conditionPickerParticipant}
        onToggle={(id) => {
          if (conditionPickerId) toggleCondition(conditionPickerId, id);
        }}
        onClose={() => setConditionPickerId(null)}
      />

      <div
        onDragOver={(e) => {
          if (!isGM) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={onDropToken}
        className="min-h-24 rounded-2xl border border-amber-900/70 bg-linear-to-r from-background-card/90 via-emerald-950/80 to-background-dark/90 px-4 py-3 shadow-2xl backdrop-blur-md"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg border border-amber-900/60 bg-black/30 px-3 py-1.5">
              <span className="block font-barlow text-[9px] font-extrabold uppercase tracking-wide text-gray-500">
                Runde
              </span>
              <span className="font-barlow text-lg font-extrabold tabular-nums text-accent-gold">
                {combatRound}
              </span>
            </div>
            {participants.length > 0 ? (
              <span className="hidden font-libre text-[11px] text-gray-400 sm:inline">
                Zug {safeTurnIndex + 1} / {participants.length}
              </span>
            ) : null}
          </div>
          {isGM ? (
            <button
              type="button"
              onClick={onNextTurn}
              disabled={participants.length === 0}
              className="rounded border border-accent-gold/70 bg-accent-gold/15 px-4 py-2 font-barlow text-xs font-extrabold uppercase text-accent-gold hover:bg-accent-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Nächster Zug
            </button>
          ) : null}
        </div>
        {participants.length === 0 ? (
          <div
            className="min-h-12 rounded-xl border border-dashed border-amber-900/70 bg-black/20"
            aria-label="Leere Initiative-Zeitleiste"
          />
        ) : (
          <div className="flex max-w-full items-start gap-4 overflow-x-auto px-4 pb-4 pt-8">
            {participants.map((participant) => {
              const active = participant.id === activeParticipantId;
              const isDead = participant.conditions.includes("dead");
              const canSideCycle = isGM && canCycleSide(participant.type);
              const visibleConditions = participant.conditions.slice(0, 4);

              return (
                <div
                  key={participant.id}
                  className="relative flex w-[5.75rem] shrink-0 flex-col items-center gap-1.5"
                >
                  <div className="flex h-6 w-full items-end justify-center">
                    {active ? (
                      <motion.span
                        className="text-lg leading-none text-accent-gold drop-shadow-[0_0_8px_rgba(202,185,38,0.75)]"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        aria-hidden
                      >
                        ▼
                      </motion.span>
                    ) : null}
                  </div>

                  <div className="relative">
                    {canSideCycle ? (
                      <button
                        type="button"
                        onClick={() => cycleParticipantSide(participant)}
                        title={sideCycleTitle(participant.side)}
                        aria-label={`${participant.name}: ${sideCycleTitle(participant.side)}`}
                        className={`grid ${TOKEN_SIZE_CLASS} shrink-0 place-items-center overflow-hidden rounded-full border bg-slate-950 transition-shadow cursor-pointer hover:brightness-110 ${getTokenRingClasses(
                          participant,
                          active,
                          isDead,
                        )}`}
                      >
                        {participant.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={participant.image_url}
                            alt=""
                            className="pointer-events-none h-full w-full object-cover"
                          />
                        ) : (
                          <span className="pointer-events-none font-barlow text-lg font-extrabold text-accent-gold">
                            {participant.type === "monster"
                              ? participant.name.replace("Monster ", "")
                              : participant.name[0]}
                          </span>
                        )}
                      </button>
                    ) : (
                      <div
                        className={`grid ${TOKEN_SIZE_CLASS} shrink-0 place-items-center overflow-hidden rounded-full border bg-slate-950 ${getTokenRingClasses(
                          participant,
                          active,
                          isDead,
                        )}`}
                        title={participant.name}
                      >
                        {participant.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={participant.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-barlow text-lg font-extrabold text-accent-gold">
                            {participant.type === "monster"
                              ? participant.name.replace("Monster ", "")
                              : participant.name[0]}
                          </span>
                        )}
                      </div>
                    )}

                    {isGM ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConditionPickerId(participant.id);
                        }}
                        className="absolute -left-2 bottom-1 grid h-5 w-5 place-items-center rounded-full border border-violet-600/60 bg-violet-950/90 text-[9px] font-barlow font-bold text-violet-200 hover:bg-violet-800"
                        title="Zustände setzen"
                        aria-label={`Zustände für ${participant.name}`}
                      >
                        ◈
                      </button>
                    ) : null}

                    {isGM ? (
                      <button
                        type="button"
                        onClick={() =>
                          void onUpdateParticipant(participant.id, { is_active: false })
                        }
                        className="absolute -right-2 top-0 grid h-6 w-6 place-items-center rounded-full border border-red-700/70 bg-red-950/90 text-red-200 hover:bg-red-800"
                        aria-label={`${participant.name} entfernen`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>

                  <div className="flex h-5 w-full items-center justify-center gap-0.5">
                    {visibleConditions.map((cid) => (
                      <ConditionIconBadge key={cid} id={cid} size="sm" />
                    ))}
                    {participant.conditions.length > 4 ? (
                      <span
                        className="grid h-5 w-5 place-items-center rounded-full border border-amber-700/60 bg-black/80 text-[8px] text-gray-300"
                        title={`${participant.conditions.length - 4} weitere Zustände`}
                      >
                        +{participant.conditions.length - 4}
                      </span>
                    ) : null}
                  </div>

                  <input
                    type="text"
                    inputMode="text"
                    value={
                      initiativeDrafts[participant.id] ??
                      formatInitiativeDisplay(
                        participant.initiative_label,
                        participant.initiative_value,
                      )
                    }
                    onChange={(e) =>
                      setInitiativeDrafts((prev) => ({
                        ...prev,
                        [participant.id]: e.target.value,
                      }))
                    }
                    onBlur={() => void commitInitiative(participant)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    disabled={!isGM}
                    placeholder="17-1"
                    className="h-7 w-16 shrink-0 rounded border border-zinc-600 bg-zinc-950 px-1 text-center font-barlow text-xs font-bold text-zinc-100 outline-none focus:border-accent-gold disabled:opacity-70"
                    aria-label={`Initiative für ${participant.name} (z. B. 17 oder 17-1)`}
                    title="Initiative: Zahl oder Tiebreak 17-1 vor 17-2"
                  />

                  <span
                    className="flex h-8 w-full items-start justify-center truncate text-center font-libre text-[10px] leading-tight text-gray-400"
                    title={participant.name}
                  >
                    {participant.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
