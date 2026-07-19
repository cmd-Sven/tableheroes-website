"use client";

import { Dices, Shield, Swords, X } from "lucide-react";
import { formatSigned } from "@/src/lib/characters/dnd5e/formulas";
import { ABILITY_LABELS_DE, type AbilityKey } from "@/src/lib/characters/dnd5e/types";
import type { DiceRollMode } from "@/src/lib/session/dice-roll";
import { useLiveSessionDiceRoll } from "@/src/components/session/useLiveSessionDiceRoll";
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";

const DICE_SIDES = [4, 6, 8, 10, 12, 20] as const;

type Props = {
  sessionId: string;
  campaignId: string;
  open: boolean;
  onToggle: () => void;
  /** Chat-Panel offen → Würfel-Panel daneben stapeln. */
  chatOpen?: boolean;
  currentCharacter: { id: string; name: string } | null;
  isPrepMode?: boolean;
  prepTestCharacters?: { id: string; name: string }[];
  prepTestCharacterId?: string | null;
  onPrepTestCharacterChange?: (id: string) => void;
  onActivityPosted?: (entry: SessionActivityEntry) => void;
};

export function LiveSessionDicePanel({
  sessionId,
  campaignId,
  open,
  onToggle,
  chatOpen = false,
  currentCharacter,
  isPrepMode = false,
  prepTestCharacters,
  prepTestCharacterId,
  onPrepTestCharacterChange,
  onActivityPosted,
}: Props) {
  const dice = useLiveSessionDiceRoll({
    sessionId,
    campaignId,
    currentCharacter,
    active: open,
    onActivityPosted,
  });

  const offsetClass = chatOpen ? "right-80 max-sm:right-0" : "right-0";

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={`fixed ${offsetClass} top-[52%] z-40 -translate-y-1/2 rounded-l-lg border border-r-0 border-amber-800/70 bg-background-card/95 px-3 py-4 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold shadow-2xl transition-[right,background-color] hover:bg-emerald-950`}
      >
        <Dices className="mx-auto mb-1 h-4 w-4" />
        {open ? "Würfel zu" : "Würfel"}
      </button>

      {open ? (
        <div
          className={`fixed inset-y-0 ${offsetClass} z-[49] flex w-full max-w-xs flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md transition-[right]`}
        >
          <div className="flex items-center justify-between border-b border-amber-900/50 px-3 py-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-barlow text-sm font-bold uppercase text-accent-gold">Würfelfenster</h2>
              <p className="font-libre text-[10px] text-gray-500">
                {isPrepMode ? "Vorbereitung · Würfe testen" : "Würfe & Kampfaktionen"}
              </p>
              {prepTestCharacters && prepTestCharacters.length > 0 ? (
                <select
                  value={prepTestCharacterId ?? prepTestCharacters[0]?.id ?? ""}
                  onChange={(e) => onPrepTestCharacterChange?.(e.target.value)}
                  className="mt-1 w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-[10px] text-white"
                >
                  {prepTestCharacters.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      Test als: {pc.name}
                    </option>
                  ))}
                </select>
              ) : currentCharacter ? (
                <p className="mt-0.5 truncate font-libre text-[10px] text-gray-400">{currentCharacter.name}</p>
              ) : null}
            </div>
            <button type="button" onClick={onToggle} className="ml-2 shrink-0 rounded p-1 text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
            {dice.primaryAttack ? (
              <p className="font-libre text-[9px] text-gray-500">
                Waffe: <span className="text-gray-300">{dice.primaryAttack.name}</span> · Angriff{" "}
                {formatSigned(dice.primaryAttack.attackBonus)} · Schaden {dice.primaryAttack.damage}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-1">
              {DICE_SIDES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!currentCharacter || dice.pending}
                  onClick={() => dice.rollDice(s)}
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
                  onClick={() => dice.setRollMode(mode)}
                  className={`flex-1 rounded border px-1 py-1 font-barlow text-[9px] font-bold uppercase ${
                    dice.rollMode === mode
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
                value={dice.selectedSkill}
                onChange={(e) => dice.onSkillChange(e.target.value)}
                className="min-w-0 flex-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-[10px] text-white"
              >
                <option value="">Fertigkeit…</option>
                {dice.skillOptions.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.labelDe}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!dice.selectedSkill || !currentCharacter || dice.pending}
                onClick={dice.handleSkillCheck}
                title="Fertigkeit würfeln"
                className="rounded border border-hero-vibrant px-2 py-1 font-barlow text-[9px] font-bold uppercase text-hero-vibrant disabled:opacity-40"
              >
                <Dices className="h-3.5 w-3.5" />
              </button>
            </div>
            {dice.selectedSkill ? (
              <p className="font-barlow text-[9px] text-gray-500">Fertigkeit: {formatSigned(dice.skillBonus)}</p>
            ) : null}

            <div className="flex gap-1">
              <select
                value={dice.selectedSave}
                onChange={(e) => dice.onSaveChange(e.target.value as AbilityKey | "")}
                className="min-w-0 flex-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-[10px] text-white"
              >
                <option value="">Rettungswurf…</option>
                {dice.saveOptions.map((key) => (
                  <option key={key} value={key}>
                    {ABILITY_LABELS_DE[key]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!dice.selectedSave || !currentCharacter || dice.pending}
                onClick={dice.handleSavingThrow}
                title="Rettungswurf würfeln"
                className="rounded border border-accent-gold/70 px-2 py-1 font-barlow text-[9px] font-bold uppercase text-accent-gold disabled:opacity-40"
              >
                <Shield className="h-3.5 w-3.5" />
              </button>
            </div>
            {dice.selectedSave ? (
              <p className="font-barlow text-[9px] text-gray-500">
                Rettung: {formatSigned(dice.saveBonus)}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!currentCharacter || dice.pending}
              onClick={dice.handleAttackRoll}
              className="flex w-full items-center justify-center gap-1 rounded border border-accent-blood/50 bg-accent-blood/10 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-blood disabled:opacity-40"
            >
              <Swords className="h-3.5 w-3.5" />
              Angriff würfeln
              {dice.primaryAttack ? ` (${formatSigned(dice.primaryAttack.attackBonus)})` : ""}
            </button>

            {!currentCharacter ? (
              <p className="font-libre text-xs text-gray-500 italic">Charakter wählen, um zu würfeln.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
