"use client";

import { useState } from "react";
import { Dices } from "lucide-react";
import {
  CHARACTER_FLAWS,
  MAX_CHARACTER_FLAWS,
  getFlawById,
  rollRandomFlawFrom2d20,
  type CharacterFlawEntry,
} from "@/src/lib/characters/character-flaws";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

export type CharacterFlawPickerProps = {
  characterFlaws: CharacterFlawEntry[];
  onCharacterFlawsChange: (entries: CharacterFlawEntry[]) => void;
  readOnly?: boolean;
  /** Kompaktere Darstellung für den Attributebogen */
  compact?: boolean;
};

type RollFlash = {
  slotIndex: number;
  die1: number;
  die2: number;
  sum: number;
  flawNr: number;
  name: string;
};

export function CharacterFlawPicker({
  characterFlaws,
  onCharacterFlawsChange,
  readOnly = false,
  compact = false,
}: CharacterFlawPickerProps) {
  const { t } = useCharacterSheetLocale();
  const [rollFlash, setRollFlash] = useState<RollFlash | null>(null);
  const usedFlawIds = new Set(characterFlaws.map((f) => f.flawId).filter(Boolean));
  const hasSelectedFlaws = usedFlawIds.size > 0;

  const textareaClass = `w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none ${
    readOnly ? "cursor-default opacity-80" : ""
  }`;

  function setFlawAt(index: number, patch: Partial<CharacterFlawEntry>) {
    const slots: CharacterFlawEntry[] = Array.from({ length: MAX_CHARACTER_FLAWS }, (_, i) =>
      characterFlaws[i] ?? { flawId: "", story: "" },
    );
    slots[index] = { ...slots[index], ...patch };
    onCharacterFlawsChange(slots.filter((f) => f.flawId.trim()).slice(0, MAX_CHARACTER_FLAWS));
  }

  function removeFlawAt(index: number) {
    const slots: CharacterFlawEntry[] = Array.from({ length: MAX_CHARACTER_FLAWS }, (_, i) =>
      characterFlaws[i] ?? { flawId: "", story: "" },
    );
    slots[index] = { flawId: "", story: "" };
    onCharacterFlawsChange(slots.filter((f) => f.flawId.trim()).slice(0, MAX_CHARACTER_FLAWS));
  }

  function rollRandomForSlot(slotIndex: number) {
    if (readOnly) return;
    const exclude = characterFlaws
      .map((f, i) => (i === slotIndex ? "" : f.flawId))
      .filter(Boolean);
    const result = rollRandomFlawFrom2d20(exclude);
    if (!result.flaw) return;
    setFlawAt(slotIndex, {
      flawId: result.flaw.id,
      story: characterFlaws[slotIndex]?.story ?? "",
    });
    setRollFlash({
      slotIndex,
      die1: result.die1,
      die2: result.die2,
      sum: result.sum,
      flawNr: result.flawNr,
      name: result.flaw.name,
    });
  }

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
      <div className="border-b border-hero-dark pb-2">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">{t("flaws.title")}</h3>
        <p className="mt-1 font-libre text-xs text-gray-500">
          {hasSelectedFlaws ? t("flaws.unlockHint") : t("flaws.emptyHint")}
        </p>
        {!readOnly ? (
          <p className="mt-1 font-libre text-[11px] text-gray-500">{t("flaws.rollRandomHint")}</p>
        ) : null}
      </div>

      {Array.from({ length: MAX_CHARACTER_FLAWS }, (_, slotIndex) => {
        const entry = characterFlaws[slotIndex];
        const flawDef = entry?.flawId ? getFlawById(entry.flawId) : null;
        const flash = rollFlash?.slotIndex === slotIndex ? rollFlash : null;

        return (
          <div
            key={slotIndex}
            className={`rounded-lg border border-hero-border/60 bg-hero-dark/20 p-4 space-y-3 ${
              compact ? "p-3 space-y-2" : ""
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-barlow text-xs font-bold uppercase text-gray-400">
                {t("flaws.slot", { n: slotIndex + 1 })}
                {slotIndex === 0 ? (
                  <span className="ml-2 text-[10px] font-normal text-gray-500">
                    {t("flaws.slotOptional")}
                  </span>
                ) : null}
              </p>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => rollRandomForSlot(slotIndex)}
                  className="inline-flex items-center gap-1.5 rounded border border-accent-gold/50 bg-accent-gold/10 px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold transition-colors hover:bg-accent-gold/20"
                  title={t("flaws.rollRandomHint")}
                >
                  <Dices className="h-3.5 w-3.5" aria-hidden />
                  {t("flaws.rollRandom")}
                </button>
              ) : null}
            </div>

            {flash ? (
              <p className="rounded border border-accent-gold/40 bg-accent-gold/10 px-2 py-1.5 font-libre text-xs text-accent-gold">
                {t("flaws.rollResult", {
                  d1: flash.die1,
                  d2: flash.die2,
                  sum: flash.sum,
                  nr: flash.flawNr,
                  name: flash.name,
                })}
              </p>
            ) : null}

            <select
              value={entry?.flawId ?? ""}
              disabled={readOnly}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) {
                  removeFlawAt(slotIndex);
                  return;
                }
                setFlawAt(slotIndex, {
                  flawId: id,
                  story: entry?.story ?? "",
                });
                setRollFlash((prev) => (prev?.slotIndex === slotIndex ? null : prev));
              }}
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-70"
            >
              <option value="">{t("flaws.selectPlaceholder")}</option>
              {CHARACTER_FLAWS.map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                  disabled={usedFlawIds.has(f.id) && entry?.flawId !== f.id}
                >
                  {f.nr}. {f.name}
                </option>
              ))}
            </select>

            {flawDef ? (
              <div
                className={`rounded border border-accent-blood/30 bg-accent-blood/5 space-y-2 text-xs ${
                  compact ? "p-2" : "p-3"
                }`}
              >
                {!compact ? (
                  <p className="font-libre text-gray-300">{flawDef.description}</p>
                ) : null}
                <p>
                  <span className="font-barlow font-bold uppercase text-accent-blood">
                    {t("flaws.disadvantage")}
                  </span>{" "}
                  <span className="font-libre text-gray-300">{flawDef.mainDisadvantage}</span>
                </p>
                <p>
                  <span className="font-barlow font-bold uppercase text-hero-vibrant">
                    {t("flaws.advantage")}
                  </span>{" "}
                  <span className="font-libre text-gray-300">{flawDef.smallAdvantage}</span>
                </p>
                {!compact ? (
                  <details className="font-libre text-gray-400">
                    <summary className="cursor-pointer text-hero-vibrant hover:underline">
                      {t("flaws.details")}
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap">{flawDef.effects}</p>
                    <p className="mt-2 italic">{flawDef.roleplay}</p>
                  </details>
                ) : null}
              </div>
            ) : null}

            {flawDef ? (
              <div>
                <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">
                  {t("flaws.storyLabel")}
                </label>
                <textarea
                  value={entry?.story ?? ""}
                  readOnly={readOnly}
                  onChange={(e) => setFlawAt(slotIndex, { story: e.target.value })}
                  rows={compact ? 2 : 3}
                  placeholder={t("flaws.storyPlaceholder")}
                  className={textareaClass}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

/** Kurzübersicht für den Biografie-Tab — verweist auf Attributebogen zur Bearbeitung. */
export function CharacterFlawSummary({
  characterFlaws,
}: {
  characterFlaws: CharacterFlawEntry[];
}) {
  const { t } = useCharacterSheetLocale();
  const selected = characterFlaws.filter((f) => f.flawId.trim());

  if (selected.length === 0) {
    return (
      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-2">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold border-b border-hero-dark pb-2">
          {t("flaws.title")}
        </h3>
        <p className="font-libre text-xs text-gray-500">{t("flaws.emptyHint")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
      <div className="border-b border-hero-dark pb-2">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">{t("flaws.title")}</h3>
        <p className="mt-1 font-libre text-xs text-gray-500">{t("flaws.summaryHint")}</p>
      </div>
      <ul className="space-y-2">
        {selected.map((entry) => {
          const def = getFlawById(entry.flawId);
          if (!def) return null;
          return (
            <li
              key={entry.flawId}
              className="rounded border border-hero-border/40 bg-hero-dark/20 px-3 py-2"
            >
              <p className="font-barlow text-xs font-bold uppercase text-white">
                {def.nr}. {def.name}
              </p>
              <p className="font-libre text-xs text-gray-400 mt-0.5">{def.mainDisadvantage}</p>
              {entry.story.trim() ? (
                <p className="font-libre text-xs text-gray-500 mt-1 italic line-clamp-2">
                  {entry.story.trim()}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
