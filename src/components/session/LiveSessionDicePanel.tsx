/**
 * LiveSessionDicePanel — Der Würfelbecher am digitalen Tisch.
 * Angriffe, Checks, Saves — hier fallen die Knochen, bevor das Schicksal spricht.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, Swords, X } from "lucide-react";
import { formatSigned } from "@/src/lib/characters/dnd5e/formulas";
import { ABILITY_LABELS_DE, type AbilityKey } from "@/src/lib/characters/dnd5e/types";
import {
  dicePoolSize,
  formatDicePoolFormula,
  type DicePoolGroup,
  type DiceRollMode,
} from "@/src/lib/session/dice-roll";
import {
  GM_DICE_ROLLER_ID,
  GM_DICE_ROLLER_NAME,
  isGmDiceRollerId,
} from "@/src/lib/session/dice-skins";
import { useLiveSessionDiceRoll } from "@/src/components/session/useLiveSessionDiceRoll";
import { DiceGlyph } from "@/src/components/session/dice/DiceGlyph";
import { DiceSkinPalette } from "@/src/components/session/dice/DiceSkinPalette";
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";

const DICE_SIDES = [4, 6, 8, 10, 12, 20] as const;
const MAX_POOL = 12;

type Props = {
  sessionId: string;
  campaignId: string;
  open: boolean;
  onToggle?: () => void;
  embedded?: boolean;
  onClose?: () => void;
  currentCharacter: { id: string; name: string } | null;
  isPrepMode?: boolean;
  prepTestCharacters?: { id: string; name: string }[];
  prepTestCharacterId?: string | null;
  onPrepTestCharacterChange?: (id: string) => void;
  onActivityPosted?: (entry: SessionActivityEntry) => void;
  userId?: string | null;
  isGM?: boolean;
};

export function LiveSessionDicePanel({
  sessionId,
  campaignId,
  open,
  onToggle,
  embedded = false,
  onClose,
  currentCharacter,
  isPrepMode = false,
  prepTestCharacters,
  prepTestCharacterId,
  onPrepTestCharacterChange,
  onActivityPosted,
  userId = null,
  isGM = false,
}: Props) {
  const [rollerId, setRollerId] = useState<string>(() =>
    currentCharacter?.id ??
    prepTestCharacterId ??
    (isGM ? GM_DICE_ROLLER_ID : ""),
  );

  useEffect(() => {
    if (!isGM && currentCharacter) {
      setRollerId(currentCharacter.id);
    }
  }, [currentCharacter?.id, isGM]);

  const roller = useMemo(() => {
    if (isGmDiceRollerId(rollerId)) {
      return { id: GM_DICE_ROLLER_ID, name: GM_DICE_ROLLER_NAME };
    }
    if (currentCharacter && rollerId === currentCharacter.id) {
      return currentCharacter;
    }
    const prepPc = prepTestCharacters?.find((pc) => pc.id === rollerId);
    if (prepPc) return prepPc;
    return null;
  }, [rollerId, currentCharacter, prepTestCharacters]);

  const dice = useLiveSessionDiceRoll({
    sessionId,
    campaignId,
    currentCharacter,
    roller,
    active: open,
    onActivityPosted,
    userId,
    isGM,
  });
  const [pool, setPool] = useState<Partial<Record<number, number>>>({});
  const handleClose = onClose ?? onToggle;

  const groups: DicePoolGroup[] = useMemo(
    () =>
      DICE_SIDES.map((sides) => ({ sides, count: pool[sides] ?? 0 })).filter(
        (g) => g.count > 0,
      ),
    [pool],
  );
  const poolCount = dicePoolSize(groups);
  const formula = groups.length > 0 ? formatDicePoolFormula(groups) : "";

  function addDie(sides: number) {
    setPool((prev) => {
      const current = prev[sides] ?? 0;
      const total = Object.values(prev).reduce<number>((s, n) => s + (n ?? 0), 0);
      if (total >= MAX_POOL) return prev;
      return { ...prev, [sides]: current + 1 };
    });
  }

  function setCount(sides: number, count: number) {
    setPool((prev) => {
      const next = { ...prev };
      const others = Object.entries(next).reduce<number>(
        (s, [k, n]) => s + (Number(k) === sides ? 0 : n ?? 0),
        0,
      );
      const clamped = Math.max(0, Math.min(MAX_POOL - others, count));
      if (clamped <= 0) delete next[sides];
      else next[sides] = clamped;
      return next;
    });
  }

  function clearPool() {
    setPool({});
  }

  function rollPool() {
    if (groups.length === 0) return;
    dice.rollPool(groups);
  }

  if (!open) return null;

  return (
    <div
      className={`${
        embedded
          ? "flex h-auto min-h-0 w-full flex-col overflow-hidden"
          : "fixed left-11 top-3 z-[80] flex w-full max-w-sm flex-col overflow-hidden"
      } border-r border-amber-900/60 bg-linear-to-b from-background-card/98 via-emerald-950/95 to-background-dark/98 shadow-2xl backdrop-blur-md`}
    >
      <div className="flex items-center justify-between border-b border-amber-900/50 px-3 py-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-barlow text-sm font-bold uppercase text-accent-gold">
            Würfelfenster
          </h2>
          <p className="font-libre text-[10px] text-gray-500">
            {isPrepMode ? "Vorbereitung · Würfe testen" : "Pool mischen & würfeln"}
          </p>
          {isGM ? (
            <select
              value={rollerId}
              onChange={(e) => {
                const next = e.target.value;
                setRollerId(next);
                if (isGmDiceRollerId(next)) return;
                onPrepTestCharacterChange?.(next);
              }}
              className="mt-1 w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-[10px] text-white"
            >
              <option value={GM_DICE_ROLLER_ID}>Als Spielleiter</option>
              {currentCharacter ? (
                <option value={currentCharacter.id}>{currentCharacter.name}</option>
              ) : null}
              {prepTestCharacters?.map((pc) => (
                <option key={pc.id} value={pc.id}>
                  Test als: {pc.name}
                </option>
              ))}
            </select>
          ) : prepTestCharacters && prepTestCharacters.length > 0 ? (
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
            <p className="mt-0.5 truncate font-libre text-[10px] text-gray-400">
              {currentCharacter.name}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="ml-2 shrink-0 rounded p-1 text-gray-400 hover:text-white"
          aria-label="Würfelfenster schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <DiceSkinPalette
          value={dice.skinId}
          onChange={dice.setSkinId}
          isGM={isGM}
        />

        <div className="grid grid-cols-6 gap-1">
          {DICE_SIDES.map((s) => {
            const n = pool[s] ?? 0;
            return (
              <button
                key={s}
                type="button"
                disabled={!dice.canRoll || dice.pending || poolCount >= MAX_POOL}
                onClick={() => addDie(s)}
                title={`W${s} hinzufügen`}
                className={`relative flex flex-col items-center gap-0.5 rounded border px-1 py-1.5 text-gray-300 hover:border-hero-vibrant hover:text-hero-vibrant disabled:opacity-40 ${
                  n > 0
                    ? "border-hero-vibrant bg-hero-vibrant/15 text-hero-vibrant"
                    : "border-hero-border/50 bg-hero-dark/50"
                }`}
              >
                <DiceGlyph sides={s} className="h-5 w-5" />
                <span className="font-barlow text-[9px] font-bold">W{s}</span>
                {n > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-gold px-0.5 font-barlow text-[9px] font-extrabold text-black">
                    {n}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {groups.length > 0 ? (
          <div className="space-y-1 rounded border border-hero-border/40 bg-black/25 px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                {formula}
              </p>
              <button
                type="button"
                onClick={clearPool}
                className="shrink-0 font-barlow text-[9px] font-bold uppercase text-gray-500 hover:text-white"
              >
                Leeren
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <span
                  key={g.sides}
                  className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-hero-dark/60 px-1 py-0.5"
                >
                  <DiceGlyph sides={g.sides} className="h-3.5 w-3.5 text-accent-gold" />
                  <button
                    type="button"
                    onClick={() => setCount(g.sides, g.count - 1)}
                    className="grid h-4 w-4 place-items-center font-barlow text-[11px] text-gray-400 hover:text-white"
                    aria-label={`W${g.sides} minus`}
                  >
                    −
                  </button>
                  <span className="min-w-[0.75rem] text-center font-barlow text-[11px] font-bold tabular-nums text-white">
                    {g.count}
                  </span>
                  <button
                    type="button"
                    disabled={poolCount >= MAX_POOL}
                    onClick={() => setCount(g.sides, g.count + 1)}
                    className="grid h-4 w-4 place-items-center font-barlow text-[11px] text-gray-400 hover:text-white disabled:opacity-40"
                    aria-label={`W${g.sides} plus`}
                  >
                    +
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="font-libre text-[10px] text-gray-500">
            Würfel antippen, um den Pool zu füllen — z. B. 1w20 + 2w6.
          </p>
        )}

        <div className="flex items-center gap-2">
          <label className="shrink-0 font-barlow text-[9px] font-bold uppercase text-gray-500">
            Mali/Boni
          </label>
          <input
            type="text"
            inputMode="text"
            value={dice.bonusMalusInput}
            onChange={(e) => dice.setBonusMalusInput(e.target.value)}
            placeholder="+2 / -1"
            title="Temporäre Mali oder Boni für W20-Würfe"
            className="min-w-0 flex-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-barlow text-[11px] tabular-nums text-white placeholder:text-gray-600 focus:border-hero-vibrant outline-none"
          />
          {dice.bonusMalus !== 0 ? (
            <span className="shrink-0 font-barlow text-[10px] font-bold tabular-nums text-accent-gold">
              {formatSigned(dice.bonusMalus)}
            </span>
          ) : null}
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

        <button
          type="button"
          disabled={!dice.canRoll || dice.pending || groups.length === 0}
          onClick={rollPool}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-hero-vibrant/60 bg-hero-vibrant/15 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-hero-vibrant disabled:opacity-40"
        >
          Würfeln{formula ? ` · ${formula}` : ""}
        </button>

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
            disabled={
              !dice.selectedSkill ||
              dice.rollingAsGm ||
              !dice.canRoll ||
              dice.pending
            }
            onClick={dice.handleSkillCheck}
            title="Fertigkeit würfeln"
            className="rounded border border-hero-vibrant px-2 py-1 text-hero-vibrant disabled:opacity-40"
          >
            <DiceGlyph sides={20} className="h-3.5 w-3.5" />
          </button>
        </div>

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
            disabled={
              !dice.selectedSave ||
              dice.rollingAsGm ||
              !dice.canRoll ||
              dice.pending
            }
            onClick={dice.handleSavingThrow}
            title="Rettungswurf würfeln"
            className="rounded border border-accent-gold/70 px-2 py-1 text-accent-gold disabled:opacity-40"
          >
            <Shield className="h-3.5 w-3.5" />
          </button>
        </div>

        {!dice.canRoll ? (
          <p className="font-libre text-[10px] italic text-gray-500">
            Charakter wählen, um zu würfeln.
          </p>
        ) : dice.rollingAsGm ? (
          <p className="font-libre text-[10px] italic text-gray-500">
            Als Spielleiter — Pool-Würfe ohne Charakterbogen.
          </p>
        ) : null}

        {dice.primaryAttack ? (
          <div className="mt-1 rounded border border-accent-blood/40 bg-accent-blood/5 p-2.5">
            <p className="font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-blood">
              Ausgerüstete Waffe
            </p>
            <p className="mt-0.5 truncate font-barlow text-xs font-bold text-white">
              {dice.primaryAttack.name}
            </p>
            <p className="mt-1 font-libre text-[10px] text-accent-gold">
              Angriff{" "}
              {formatSigned(dice.primaryAttack.attackBonus + dice.bonusMalus)}
              {dice.bonusMalus !== 0 ? (
                <span className="text-gray-500">
                  {" "}
                  ({formatSigned(dice.primaryAttack.attackBonus)}
                  {formatSigned(dice.bonusMalus)})
                </span>
              ) : null}
              {" · "}
              Schaden {dice.primaryAttack.damage}
            </p>
            {dice.primaryAttack.notes ? (
              <p className="mt-0.5 font-libre text-[9px] text-gray-500">
                {dice.primaryAttack.notes}
              </p>
            ) : null}
            <button
              type="button"
              disabled={dice.rollingAsGm || !dice.canRoll || dice.pending}
              onClick={dice.handleAttackRoll}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-accent-blood/60 bg-accent-blood/15 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-blood disabled:opacity-40"
            >
              <Swords className="h-3.5 w-3.5" />
              Angriff
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
