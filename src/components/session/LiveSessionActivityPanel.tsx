"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Dices, MessageSquare, Send, Swords, X } from "lucide-react";
import { toast } from "sonner";
import {
  appendSessionActivity,
  resolveCombatRequest,
  type SessionActivityEntry,
} from "@/src/lib/actions/session-activity-actions";
import { loadDnd5eCharacterSheet } from "@/src/app/dashboard/campaigns/[id]/character-sheet-actions";
import { DND5E_SKILLS } from "@/src/lib/characters/dnd5e/skills";
import { computeDerivedDnd5eSheet } from "@/src/lib/characters/dnd5e/derived";
import {
  executeDiceRoll,
  parseRollCommand,
  type DiceRollMode,
} from "@/src/lib/session/dice-roll";
import { formatSigned } from "@/src/lib/characters/dnd5e/formulas";

const ACTIVITY_TYPES = new Set([
  "dice",
  "player_action",
  "attack_pending",
  "attack_hit",
  "attack_miss",
  "skill_check",
]);

type Props = {
  sessionId: string;
  campaignId: string;
  isGM: boolean;
  open: boolean;
  onToggle: () => void;
  logs: SessionActivityEntry[];
  currentCharacter: { id: string; name: string } | null;
};

const DICE_SIDES = [4, 6, 8, 10, 12, 20] as const;

export function LiveSessionActivityPanel({
  sessionId,
  campaignId,
  isGM,
  open,
  onToggle,
  logs,
  currentCharacter,
}: Props) {
  const [input, setInput] = useState("");
  const [rollMode, setRollMode] = useState<DiceRollMode>("normal");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [skillBonus, setSkillBonus] = useState(0);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const activityLogs = useMemo(
    () =>
      logs.filter((l) => ACTIVITY_TYPES.has(String(l.type ?? ""))).slice(-80),
    [logs],
  );

  useEffect(() => {
    if (!open || !currentCharacter) return;
    void loadDnd5eCharacterSheet(campaignId, currentCharacter.id).then((payload) => {
      if (!payload) return;
      const derived = computeDerivedDnd5eSheet(payload.sheet, payload.level);
      if (selectedSkill && derived.skills[selectedSkill as keyof typeof derived.skills]) {
        setSkillBonus(derived.skills[selectedSkill as keyof typeof derived.skills].total);
      }
    });
  }, [campaignId, currentCharacter, open, selectedSkill]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activityLogs.length, open]);

  function postActivity(type: string, text: string, meta?: Record<string, unknown>) {
    startTransition(async () => {
      try {
        await appendSessionActivity({
          sessionId,
          type,
          text,
          characterId: currentCharacter?.id,
          characterName: currentCharacter?.name,
          meta,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Eintrag fehlgeschlagen.");
      }
    });
  }

  function rollDice(sides: number, mode: DiceRollMode = rollMode, modifier = 0, label?: string) {
    if (!currentCharacter) {
      toast.error("Kein Charakter ausgewählt.");
      return;
    }
    const outcome = executeDiceRoll({ dice: 1, sides, modifier }, mode);
    const prefix = label ? `${currentCharacter.name} würfelt ${label}` : `${currentCharacter.name} w${sides} gewürfelt`;
    const text = `${prefix}: ${outcome.display}`;
    postActivity("dice", text, {
      ...outcome,
      label,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !currentCharacter) return;

    const parsed = parseRollCommand(trimmed);
    if (parsed) {
      const outcome = executeDiceRoll(parsed, rollMode);
      postActivity("dice", `${currentCharacter.name}: ${outcome.formula} → ${outcome.display}`, outcome);
      setInput("");
      return;
    }

    postActivity("player_action", `${currentCharacter.name}: ${trimmed}`);
    setInput("");
  }

  function handleSkillCheck() {
    if (!currentCharacter || !selectedSkill) return;
    const def = DND5E_SKILLS.find((s) => s.key === selectedSkill);
    const label = def?.labelDe ?? selectedSkill;
    rollDice(20, rollMode, skillBonus, label);
  }

  function handleAttackRoll() {
    if (!currentCharacter) return;
    const outcome = executeDiceRoll({ dice: 1, sides: 20, modifier: 0 }, rollMode);
    postActivity("attack_pending", `${currentCharacter.name} — Angriff: ${outcome.display} — SL: trifft?`, {
      ...outcome,
      pending: true,
    });
  }

  function resolveAttack(requestId: string, hit: boolean, critical = false) {
    startTransition(async () => {
      try {
        await resolveCombatRequest({ sessionId, requestId, hit, critical });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Antwort fehlgeschlagen.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="fixed right-0 top-[38%] z-40 -translate-y-1/2 rounded-l-lg border border-r-0 border-amber-800/70 bg-background-card/95 px-3 py-4 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant shadow-2xl transition-colors hover:bg-emerald-950"
      >
        <MessageSquare className="mx-auto mb-1 h-4 w-4" />
        {open ? "Chat zu" : "Chat"}
      </button>

      {open ? (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-amber-900/50 px-3 py-2">
            <div>
              <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">Session-Chat</h2>
              <p className="font-libre text-[10px] text-gray-500">Würfe & Aktionen</p>
            </div>
            <button type="button" onClick={onToggle} className="rounded p-1 text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {activityLogs.length === 0 ? (
              <p className="font-libre text-xs text-gray-500 italic">Noch keine Aktivität.</p>
            ) : (
              activityLogs.map((entry) => {
                const meta = entry.meta as { isCritical?: boolean; isFumble?: boolean; pending?: boolean } | undefined;
                const isCrit = meta?.isCritical;
                const isFumble = meta?.isFumble;
                return (
                  <div
                    key={entry.id}
                    className={`rounded border px-2 py-1.5 ${
                      isCrit
                        ? "border-accent-gold/70 bg-accent-gold/10"
                        : isFumble
                          ? "border-red-500/60 bg-red-950/30"
                          : "border-hero-border/30 bg-hero-dark/25"
                    }`}
                  >
                    <p className="font-libre text-[10px] text-gray-500">
                      {new Date(entry.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      {entry.author_name ? ` · ${entry.author_name}` : ""}
                    </p>
                    <p
                      className={`font-libre text-xs leading-snug ${
                        isCrit ? "text-accent-gold font-bold" : isFumble ? "text-red-300" : "text-gray-200"
                      }`}
                    >
                      {isCrit ? "⚡ KRITISCH! " : isFumble ? "💀 Patzer! " : ""}
                      {entry.text}
                    </p>
                    {isGM && entry.type === "attack_pending" ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => resolveAttack(entry.id, true, isCrit)}
                          className="rounded border border-hero-vibrant px-2 py-0.5 font-barlow text-[9px] uppercase text-hero-vibrant"
                        >
                          Trifft
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => resolveAttack(entry.id, true, true)}
                          className="rounded border border-accent-gold px-2 py-0.5 font-barlow text-[9px] uppercase text-accent-gold"
                        >
                          Kritisch
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => resolveAttack(entry.id, false)}
                          className="rounded border border-red-500/60 px-2 py-0.5 font-barlow text-[9px] uppercase text-red-300"
                        >
                          Verfehlt
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="shrink-0 border-t border-amber-900/50 p-3 space-y-2">
            <div className="flex flex-wrap gap-1">
              {DICE_SIDES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!currentCharacter || pending}
                  onClick={() => rollDice(s)}
                  className="rounded border border-hero-border/50 bg-hero-dark/50 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-gray-300 hover:border-hero-vibrant hover:text-hero-vibrant disabled:opacity-40"
                >
                  w{s}
                </button>
              ))}
            </div>

            <div className="flex gap-1">
              {(["normal", "advantage", "disadvantage"] as DiceRollMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRollMode(mode)}
                  className={`flex-1 rounded border px-1 py-1 font-barlow text-[9px] font-bold uppercase ${
                    rollMode === mode
                      ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                      : "border-hero-border/40 text-gray-500"
                  }`}
                >
                  {mode === "advantage" ? "VOR" : mode === "disadvantage" ? "NACH" : "—"}
                </button>
              ))}
            </div>

            <div className="flex gap-1">
              <select
                value={selectedSkill}
                onChange={(e) => {
                  setSelectedSkill(e.target.value);
                  if (!currentCharacter || !e.target.value) return;
                  void loadDnd5eCharacterSheet(campaignId, currentCharacter.id).then((payload) => {
                    if (!payload) return;
                    const derived = computeDerivedDnd5eSheet(payload.sheet, payload.level);
                    const key = e.target.value as keyof typeof derived.skills;
                    setSkillBonus(derived.skills[key]?.total ?? 0);
                  });
                }}
                className="min-w-0 flex-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-[10px] text-white"
              >
                <option value="">Fertigkeit…</option>
                {DND5E_SKILLS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.labelDe}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedSkill || !currentCharacter || pending}
                onClick={handleSkillCheck}
                className="rounded border border-hero-vibrant px-2 py-1 font-barlow text-[9px] font-bold uppercase text-hero-vibrant disabled:opacity-40"
              >
                <Dices className="h-3.5 w-3.5" />
              </button>
            </div>
            {selectedSkill ? (
              <p className="font-barlow text-[9px] text-gray-500">
                Bonus: {formatSigned(skillBonus)}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!currentCharacter || pending}
              onClick={handleAttackRoll}
              className="flex w-full items-center justify-center gap-1 rounded border border-accent-blood/50 bg-accent-blood/10 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-blood disabled:opacity-40"
            >
              <Swords className="h-3.5 w-3.5" />
              Angriff würfeln
            </button>

            <form onSubmit={handleSubmit} className="flex gap-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="/roll w20 + 4"
                className="min-w-0 flex-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-libre text-xs text-white"
              />
              <button
                type="submit"
                disabled={!input.trim() || !currentCharacter || pending}
                className="rounded bg-hero-vibrant px-2 text-black disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
