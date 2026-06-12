"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import {
  DND5E_COMBAT_CONDITIONS,
  type CombatConditionId,
} from "@/src/lib/combat-initiative";
import {
  COMBAT_CONDITION_ICONS,
  ConditionIconBadge,
} from "@/src/components/session/combat-condition-icons";

type ParticipantPreview = {
  name: string;
  type: "player" | "monster" | "npc";
  image_url: string | null;
  conditions: CombatConditionId[];
};

type Props = {
  open: boolean;
  participant: ParticipantPreview | null;
  onToggle: (id: CombatConditionId) => void;
  onClose: () => void;
};

export function ConditionPickerModal({
  open,
  participant,
  onToggle,
  onClose,
}: Props) {
  const options = useMemo(
    () =>
      participant
        ? DND5E_COMBAT_CONDITIONS.filter(
            (c) =>
              !c.monsterOnly ||
              participant.type === "monster" ||
              participant.type === "npc",
          )
        : [],
    [participant],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && participant ? (
        <motion.div
          key="condition-picker-modal"
          role="presentation"
          className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            role="button"
            tabIndex={0}
            aria-label="Schließen"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="condition-picker-modal-title"
            className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-background-card/95 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-md"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hero-border/60 bg-black/20 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-amber-900/70 bg-slate-950">
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
                        ? participant.name.replace("Monster ", "")[0]
                        : participant.name[0]}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2
                    id="condition-picker-modal-title"
                    className="truncate font-barlow text-xl font-extrabold uppercase tracking-wide text-hero-vibrant sm:text-2xl"
                  >
                    Zustände
                  </h2>
                  <p className="truncate font-libre text-xs text-gray-400 sm:text-sm">
                    {participant.name} — Mehrfachauswahl per Klick
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/20 text-gray-200 transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
                aria-label="Modal schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              <p className="mb-4 font-libre text-xs leading-snug text-gray-400 sm:text-sm">
                D&amp;D-5e-PHB-Zustände plus Konzentration und Tot. Aktive Zustände
                sind hervorgehoben.
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {options.map((opt) => {
                  const active = participant.conditions.includes(opt.id);
                  const Icon = COMBAT_CONDITION_ICONS[opt.id];
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onToggle(opt.id)}
                      aria-pressed={active}
                      className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center transition-colors ${
                        active
                          ? "border-accent-gold/70 bg-accent-gold/15 text-accent-gold shadow-[0_0_12px_rgba(202,185,38,0.25)]"
                          : "border-hero-border/50 bg-black/20 text-gray-300 hover:border-amber-900/70 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`grid h-11 w-11 place-items-center rounded-full border ${
                          active
                            ? "border-accent-gold/60 bg-black/30"
                            : "border-white/10 bg-black/40"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" aria-hidden />
                      </span>
                      <span className="font-libre text-xs leading-tight sm:text-sm">
                        {opt.label}
                      </span>
                      {!opt.isStandard5e ? (
                        <span className="font-barlow text-[9px] uppercase tracking-wide text-gray-500">
                          SL
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {participant.conditions.length > 0 ? (
                <div className="mt-5 rounded-xl border border-hero-border/50 bg-black/20 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent-gold" aria-hidden />
                    <span className="font-barlow text-[10px] font-extrabold uppercase text-accent-gold">
                      Aktive Zustände
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {participant.conditions.map((id) => (
                      <ConditionIconBadge key={id} id={id} size="md" />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <footer className="flex shrink-0 justify-end border-t border-hero-border/60 bg-black/20 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-accent-gold/70 bg-accent-gold/15 px-5 py-2 font-barlow text-xs font-extrabold uppercase text-accent-gold hover:bg-accent-gold/25"
              >
                Fertig
              </button>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
