"use client";

import { useState } from "react";
import { BedDouble, Coffee, Dices, Loader2 } from "lucide-react";
import type { Dnd5eSheetData } from "@/src/lib/characters/dnd5e/types";
import {
  applyLongRest,
  applyShortRest,
  conScoreFromSheet,
  getHitDiceRemaining,
  parseHitDiceString,
  rollHitDiceRecovery,
} from "@/src/lib/characters/dnd5e/rest";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  sheet: Dnd5eSheetData;
  className: string;
  readOnly: boolean;
  onSheetChange: (sheet: Dnd5eSheetData) => void;
  onPersist?: () => void;
};

export function CharacterRestPanel({
  sheet,
  className,
  readOnly,
  onSheetChange,
  onPersist,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const [hitDiceModal, setHitDiceModal] = useState(false);
  const [diceToSpend, setDiceToSpend] = useState(0);
  const [manualHp, setManualHp] = useState<number | "">("");
  const [previewRolls, setPreviewRolls] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const parsed = parseHitDiceString(sheet.combat.hitDice);
  const remaining = getHitDiceRemaining(sheet);
  const conScore = conScoreFromSheet(sheet);

  function handleShortRestClick() {
    if (readOnly) return;
    setDiceToSpend(0);
    setManualHp("");
    setPreviewRolls([]);
    setHitDiceModal(true);
  }

  function handleLongRestClick() {
    if (readOnly) return;
    if (!confirm(t("rest.longRestConfirm"))) return;
    const next = applyLongRest(sheet, className);
    onSheetChange(next);
    onPersist?.();
  }

  function rollPreview() {
    if (!parsed || diceToSpend <= 0) return;
    const { rolls, total } = rollHitDiceRecovery(diceToSpend, parsed.dieSides, conScore);
    setPreviewRolls(rolls);
    setManualHp(total);
  }

  function confirmShortRest() {
    setBusy(true);
    const manual =
      manualHp !== "" && Number.isFinite(Number(manualHp)) ? Number(manualHp) : undefined;
    const result = applyShortRest(sheet, className, conScore, diceToSpend, manual);
    onSheetChange(result.sheet);
    setHitDiceModal(false);
    setBusy(false);
    onPersist?.();
    if (result.hitDiceSpent > 0) {
      const rollText =
        result.rolls.length > 0 ? ` (${result.rolls.join(" + ")})` : "";
      alert(t("rest.hpRecovered", { amount: result.hpRecovered }) + rollText);
    }
  }

  function skipHitDiceShortRest() {
    const result = applyShortRest(sheet, className, conScore, 0);
    onSheetChange(result.sheet);
    setHitDiceModal(false);
    onPersist?.();
  }

  return (
    <>
      <section className="rounded-lg border border-hero-dark bg-background-card p-3 space-y-2">
        <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold border-b border-hero-dark pb-1.5">
          {t("rest.title")}
        </h3>
        <p className="font-libre text-[10px] text-gray-500 leading-snug">{t("rest.hint")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={readOnly}
            onClick={handleShortRestClick}
            className="inline-flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded border border-hero-border bg-hero-dark/50 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-dark disabled:opacity-40"
          >
            <Coffee className="h-3.5 w-3.5" />
            {t("rest.shortRest")}
          </button>
          <button
            type="button"
            disabled={readOnly}
            onClick={handleLongRestClick}
            className="inline-flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded border border-hero-border bg-hero-dark/50 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-hero-dark disabled:opacity-40"
          >
            <BedDouble className="h-3.5 w-3.5" />
            {t("rest.longRest")}
          </button>
        </div>
        {parsed ? (
          <p className="font-libre text-[9px] text-gray-600">
            {t("rest.hitDiceRemaining", {
              remaining,
              total: parsed.total,
              die: parsed.dieSides,
            })}
          </p>
        ) : null}
      </section>

      {hitDiceModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl">
            <h3 className="font-barlow text-sm font-extrabold uppercase text-accent-gold">
              {t("rest.hitDiceTitle")}
            </h3>
            <p className="mt-2 font-libre text-xs text-gray-400">{t("rest.hitDiceHint")}</p>

            <label className="mt-4 block space-y-1">
              <span className="font-barlow text-[10px] uppercase text-gray-500">
                {t("rest.diceCount")}
              </span>
              <input
                type="number"
                min={0}
                max={remaining}
                value={diceToSpend}
                onChange={(e) =>
                  setDiceToSpend(
                    Math.max(0, Math.min(remaining, Math.round(Number(e.target.value) || 0))),
                  )
                }
                className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-barlow text-sm text-white"
              />
            </label>

            {diceToSpend > 0 && parsed ? (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={rollPreview}
                  className="inline-flex items-center gap-1.5 rounded border border-hero-vibrant px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant"
                >
                  <Dices className="h-3.5 w-3.5" />
                  {t("rest.rollDice")}
                </button>
                {previewRolls.length > 0 ? (
                  <p className="font-libre text-xs text-gray-300">
                    {t("rest.rolls", { rolls: previewRolls.join(" + ") })}
                  </p>
                ) : null}
                <label className="block space-y-1">
                  <span className="font-barlow text-[10px] uppercase text-gray-500">
                    {t("rest.hpManual")}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={manualHp}
                    onChange={(e) =>
                      setManualHp(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
                    }
                    className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-barlow text-sm text-white"
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHitDiceModal(false)}
                className="rounded border border-hero-border px-3 py-1.5 font-barlow text-[10px] uppercase text-gray-400"
              >
                {t("inventory.cancel")}
              </button>
              <button
                type="button"
                onClick={skipHitDiceShortRest}
                className="rounded border border-hero-border px-3 py-1.5 font-barlow text-[10px] uppercase text-gray-300"
              >
                {t("rest.skipHitDice")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={confirmShortRest}
                className="inline-flex items-center gap-1 rounded bg-hero-vibrant px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-black disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {t("rest.applyShortRest")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
