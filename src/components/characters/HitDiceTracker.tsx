"use client";

import { parseHitDiceString } from "@/src/lib/characters/dnd5e/rest";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  hitDice: string;
  hitDiceRemaining: number | null | undefined;
  readOnly: boolean;
  onHitDiceChange: (value: string) => void;
  onHitDiceRemainingChange: (remaining: number) => void;
};

export function HitDiceTracker({
  hitDice,
  hitDiceRemaining,
  readOnly,
  onHitDiceChange,
  onHitDiceRemainingChange,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const parsed = parseHitDiceString(hitDice);
  const total = parsed?.total ?? 0;
  const stored = hitDiceRemaining;
  const remaining =
    parsed == null
      ? 0
      : stored == null || !Number.isFinite(stored)
        ? parsed.total
        : Math.max(0, Math.min(parsed.total, Math.round(stored)));
  const used = Math.max(0, total - remaining);

  function setUsedCount(nextUsed: number) {
    if (!parsed || readOnly) return;
    const clamped = Math.max(0, Math.min(total, nextUsed));
    onHitDiceRemainingChange(total - clamped);
  }

  function handleDieClick(index: number) {
    if (readOnly || !parsed) return;
    if (index < used) {
      setUsedCount(index);
    } else {
      setUsedCount(index + 1);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-barlow text-[10px] uppercase text-gray-500">
          {t("combat.hitDice")}
        </span>
        {parsed ? (
          <span className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
            d{parsed.dieSides}
          </span>
        ) : null}
      </div>

      {readOnly ? (
        <p className="font-barlow text-sm font-bold text-white">{hitDice || "—"}</p>
      ) : (
        <input
          type="text"
          value={hitDice}
          onChange={(e) => onHitDiceChange(e.target.value)}
          className="w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-barlow text-sm text-white focus:border-hero-vibrant outline-none"
          placeholder="6d10"
          aria-label={t("combat.hitDice")}
        />
      )}

      {parsed && total > 0 ? (
        <>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("combat.hitDiceUsage")}>
            {Array.from({ length: total }, (_, index) => {
              const spent = index < used;
              return (
                <button
                  key={index}
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleDieClick(index)}
                  aria-pressed={spent}
                  aria-label={t("combat.hitDiceDieAria", {
                    n: index + 1,
                    state: spent ? t("combat.hitDiceSpent") : t("combat.hitDiceAvailable"),
                  })}
                  className={`flex h-8 w-8 items-center justify-center rounded border font-barlow text-xs font-bold uppercase transition-colors ${
                    spent
                      ? "border-accent-blood/60 bg-accent-blood/20 text-accent-blood"
                      : "border-hero-vibrant/50 bg-hero-vibrant/10 text-hero-vibrant hover:border-hero-vibrant hover:bg-hero-vibrant/20"
                  } ${readOnly ? "cursor-default opacity-90" : "cursor-pointer"}`}
                >
                  {spent ? "✓" : "○"}
                </button>
              );
            })}
          </div>
          <p className="font-libre text-[10px] text-gray-500 leading-snug">
            {t("combat.hitDiceUsageHint", {
              used,
              remaining,
              total,
              die: parsed.dieSides,
            })}
          </p>
        </>
      ) : (
        <p className="font-libre text-[10px] text-gray-500 italic">
          {t("combat.hitDiceInvalid")}
        </p>
      )}
    </div>
  );
}
