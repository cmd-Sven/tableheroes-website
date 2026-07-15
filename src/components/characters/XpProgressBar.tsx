"use client";

import { xpProgressInLevel, xpToNextLevel } from "@/src/lib/characters/dnd5e/xp-table";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  currentXp: number;
  level: number;
  editMode: boolean;
  readOnly: boolean;
  onChange?: (xp: number) => void;
};

export function XpProgressBar({
  currentXp,
  level,
  editMode,
  readOnly,
  onChange,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const progress = xpProgressInLevel(currentXp, level);
  const nextThreshold = xpToNextLevel(level);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
          {t("field.experiencePoints")}
        </span>
        {(editMode && !readOnly) || progress.atMaxLevel ? (
          <span className="font-barlow text-[10px] text-gray-400">
            {progress.atMaxLevel
              ? t("xp.maxLevel")
              : t("xp.exact", { current: currentXp, next: nextThreshold ?? 0 })}
          </span>
        ) : null}
      </div>

      <div
        className="group relative"
        title={
          progress.atMaxLevel
            ? t("xp.maxLevelTooltip", { xp: currentXp })
            : t("xp.tooltip", {
                current: currentXp,
                level,
                inLevel: progress.current,
                needed: progress.needed,
              })
        }
      >
        <div className="h-3 overflow-hidden rounded-full border border-hero-border/50 bg-hero-dark">
          <div
            className="h-full rounded-full bg-gradient-to-r from-hero-dark via-hero-vibrant to-accent-gold transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        {!editMode ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center font-barlow text-[9px] font-bold uppercase text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
            {progress.atMaxLevel
              ? `${currentXp.toLocaleString("de-DE")} XP`
              : `${progress.current.toLocaleString("de-DE")} / ${progress.needed.toLocaleString("de-DE")}`}
          </p>
        ) : null}
      </div>

      {editMode && !readOnly && onChange ? (
        <input
          type="number"
          min={0}
          value={currentXp}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1 text-center font-barlow text-sm text-white"
          aria-label={t("field.experiencePoints")}
        />
      ) : null}
    </div>
  );
}
