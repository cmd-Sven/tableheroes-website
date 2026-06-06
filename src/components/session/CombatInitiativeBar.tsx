"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { DragEvent } from "react";
import {
  AlertTriangle,
  Ban,
  EyeOff,
  EarOff,
  FlaskConical,
  Ghost,
  Grip,
  Heart,
  Lock,
  MessageCircleOff,
  Minimize2,
  Moon,
  Mountain,
  Skull,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DND5E_COMBAT_CONDITIONS,
  formatInitiativeDisplay,
  getCombatConditionDef,
  parseInitiativeLabel,
  type CombatConditionId,
} from "@/src/lib/combat-initiative";

export type CombatInitiativeParticipant = {
  id: string;
  name: string;
  type: "player" | "monster";
  initiative_value: number;
  initiative_label?: string | null;
  sort_order: number;
  image_url: string | null;
  is_active: boolean;
  conditions: CombatConditionId[];
};

const CONDITION_ICONS: Record<CombatConditionId, LucideIcon> = {
  concentration: Sparkles,
  blinded: EyeOff,
  deafened: EarOff,
  silenced: MessageCircleOff,
  stunned: Zap,
  prone: Minimize2,
  dead: Skull,
  frightened: AlertTriangle,
  poisoned: FlaskConical,
  grappled: Grip,
  restrained: Lock,
  paralyzed: Ban,
  unconscious: Moon,
  invisible: Ghost,
  charmed: Heart,
  incapacitated: Ban,
  petrified: Mountain,
};

type Props = {
  participants: CombatInitiativeParticipant[];
  activeParticipantId: string | null;
  isGM: boolean;
  onNextTurn: () => void;
  onUpdateParticipant: (
    id: string,
    patch: Partial<
      Pick<
        CombatInitiativeParticipant,
        "initiative_value" | "initiative_label" | "is_active" | "conditions"
      >
    >,
  ) => void | Promise<void>;
  onDropToken: (event: DragEvent<HTMLDivElement>) => void;
};

function ConditionBadge({ id }: { id: CombatConditionId }) {
  const def = getCombatConditionDef(id);
  const Icon = CONDITION_ICONS[id];
  if (!def) return null;
  return (
    <span
      title={def.label}
      className={`inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border px-1 text-[9px] font-barlow font-extrabold ${
        id === "dead"
          ? "border-red-700 bg-red-950 text-red-200"
          : id === "concentration"
            ? "border-violet-500/70 bg-violet-950/90 text-violet-200"
            : "border-amber-700/60 bg-amber-950/80 text-amber-100"
      }`}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">{def.short}</span>
    </span>
  );
}

function ConditionPicker({
  participant,
  onToggle,
  onClose,
}: {
  participant: CombatInitiativeParticipant;
  onToggle: (id: CombatConditionId) => void;
  onClose: () => void;
}) {
  const options = useMemo(
    () =>
      DND5E_COMBAT_CONDITIONS.filter(
        (c) => !c.monsterOnly || participant.type === "monster",
      ),
    [participant.type],
  );

  return (
    <div className="absolute left-1/2 top-full z-40 mt-2 w-56 -translate-x-1/2 rounded-xl border border-amber-900/70 bg-background-card/98 p-2 shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-hero-border/40 pb-2">
        <span className="font-barlow text-[10px] font-extrabold uppercase text-accent-gold">
          Zustände
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
          aria-label="Schließen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mb-2 font-libre text-[10px] text-gray-400 leading-snug">
        D&D-5e-PHB-Zustände + Konzentration/Tot. Mehrfachauswahl möglich.
      </p>
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {options.map((opt) => {
          const active = participant.conditions.includes(opt.id);
          const Icon = CONDITION_ICONS[opt.id];
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${
                active
                  ? "bg-accent-gold/20 text-accent-gold"
                  : "text-gray-300 hover:bg-white/5"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="font-libre text-xs">{opt.label}</span>
              {!opt.isStandard5e ? (
                <span className="ml-auto font-barlow text-[9px] uppercase text-gray-500">SL</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CombatInitiativeBar({
  participants,
  activeParticipantId,
  isGM,
  onNextTurn,
  onUpdateParticipant,
  onDropToken,
}: Props) {
  const [initiativeDrafts, setInitiativeDrafts] = useState<Record<string, string>>({});
  const [conditionPickerId, setConditionPickerId] = useState<string | null>(null);

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

  return (
    <div className="relative">
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
        <div className="mb-2 flex items-center justify-end gap-3">
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
          <div className="flex max-w-full items-end gap-4 overflow-x-auto px-4 pb-7 pt-10">
            {participants.map((participant) => {
              const active = participant.id === activeParticipantId;
              const isDead = participant.conditions.includes("dead");
              return (
                <motion.div
                  key={participant.id}
                  className="relative flex shrink-0 flex-col items-center gap-2"
                  animate={active ? { scale: 1.08 } : { scale: 1 }}
                  transition={{ type: "spring", damping: 18, stiffness: 220 }}
                >
                  {active ? (
                    <motion.div
                      className="absolute -top-8 text-xl text-accent-gold drop-shadow-[0_0_8px_rgba(202,185,38,0.75)]"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      ▼
                    </motion.div>
                  ) : null}
                  <div className="relative">
                    <div
                      className={`grid h-17.5 w-17.5 place-items-center overflow-hidden rounded-full border bg-slate-950 ${
                        isDead
                          ? "opacity-45 grayscale"
                          : active
                            ? "border-accent-gold ring-2 ring-accent-gold/45 ring-offset-2 ring-offset-background-dark shadow-[0_0_14px_rgba(202,185,38,0.55)]"
                            : "border-amber-900/70"
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
                        <span className="font-barlow text-lg font-extrabold text-accent-gold">
                          {participant.type === "monster"
                            ? participant.name.replace("Monster ", "")
                            : participant.name[0]}
                        </span>
                      )}
                    </div>
                    {participant.conditions.length > 0 ? (
                      <div className="absolute -bottom-1 left-1/2 flex max-w-[5.5rem] -translate-x-1/2 flex-wrap justify-center gap-0.5">
                        {participant.conditions.slice(0, 4).map((cid) => (
                          <ConditionBadge key={cid} id={cid} />
                        ))}
                        {participant.conditions.length > 4 ? (
                          <span className="rounded-full bg-black/80 px-1 text-[8px] text-gray-300">
                            +{participant.conditions.length - 4}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {isGM ? (
                      <button
                        type="button"
                        onClick={() =>
                          setConditionPickerId((cur) =>
                            cur === participant.id ? null : participant.id,
                          )
                        }
                        className="absolute -left-2 bottom-0 grid h-5 w-5 place-items-center rounded-full border border-violet-600/60 bg-violet-950/90 text-[9px] font-barlow font-bold text-violet-200 hover:bg-violet-800"
                        title="Zustände setzen"
                        aria-label={`Zustände für ${participant.name}`}
                      >
                        ◈
                      </button>
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
                    className="w-16 rounded border border-zinc-600 bg-zinc-950 px-1 py-0.5 text-center font-barlow text-xs font-bold text-zinc-100 outline-none focus:border-accent-gold disabled:opacity-70"
                    aria-label={`Initiative für ${participant.name} (z. B. 17 oder 17-1)`}
                    title="Initiative: Zahl oder Tiebreak 17-1 vor 17-2"
                  />
                  <span className="max-w-[4.5rem] truncate text-center font-libre text-[10px] text-gray-400">
                    {participant.name}
                  </span>
                  {conditionPickerId === participant.id && isGM ? (
                    <ConditionPicker
                      participant={participant}
                      onToggle={(id) => toggleCondition(participant.id, id)}
                      onClose={() => setConditionPickerId(null)}
                    />
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
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
